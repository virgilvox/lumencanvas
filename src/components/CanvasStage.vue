<template>
  <div 
    class="canvas-container" 
    ref="containerRef"
    @wheel.prevent="onWheel"
    @mousedown="onCanvasMouseDown"
  >
    <div 
      class="canvas-wrapper"
      :style="{
        transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
        transformOrigin: 'top left'
      }"
    >
      <application
        ref="appRef"
        :width="projectStore.canvasWidth"
        :height="projectStore.canvasHeight"
        :background="0x000000"
        :antialias="true"
        @init="onInit"
      >
        <container>
          <!-- Canvas bounding box -->
          <graphics ref="boundingBoxRef" @render="drawCanvasBoundingBox" />
          
          <!-- Render each layer using LayerRenderer -->
          <LayerRenderer
            v-for="layer in [...layers].reverse()"
            :key="layer.id"
            :layer="layer"
            :canvas-width="projectStore.canvasWidth"
            :canvas-height="projectStore.canvasHeight"
            :selected="selectedLayers.includes(layer.id)"
            :is-edit-mode="true"
            @pointerdown="onLayerPointerDown($event, layer)"
            @select="selectLayer"
          />
          
          <!-- Selection outline and warp handles -->
          <container v-if="selectedLayer">
            <graphics @render="drawSelectionOutline" />
            <container v-if="selectedLayer.warp && selectedLayer.warp.enabled">
              <WarpHandle
                v-for="(point, index) in selectedLayer.warp.points"
                :key="`handle-${index}`"
                :id="`${selectedLayer.id}-${index}`"
                :x="point.x"
                :y="point.y"
                @update:position="pos => updateWarpPoint(index, pos)"
              />
            </container>
          </container>
        </container>
      </application>
      
      <!-- Warped iframes are rendered here in a separate overlay -->
      <div class="iframe-overlay">
        <WarpedIframe
          v-for="layer in urlLayers"
          :key="layer.id"
          :layer="layer"
          :canvas-width="projectStore.canvasWidth"
          :canvas-height="projectStore.canvasHeight"
        />
      </div>
    </div>
    
    <div class="zoom-controls">
      <button class="zoom-button" @click="zoomOut" :disabled="zoom <= 0.25">-</button>
      <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
      <button class="zoom-button" @click="zoomIn" :disabled="zoom >= 3">+</button>
      <button class="zoom-button fit" @click="resetZoom">Fit</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { Application } from 'vue3-pixi';
import { useLayersStore } from '../store/layers';
import { useProjectStore } from '../store/project';
import { useHistoryStore } from '../store/history';
import { commandFactory } from '../utils/commandFactory';
import LayerRenderer from './layers/LayerRenderer.vue';
import WarpHandle from './WarpHandle.vue';
import WarpedIframe from './layers/WarpedIframe.vue';

const layersStore = useLayersStore();
const projectStore = useProjectStore();
const historyStore = useHistoryStore();
const { layers, selectedLayer } = storeToRefs(layersStore);

const appRef = ref(null);
const containerRef = ref(null);
const boundingBoxRef = ref(null);
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);
const isPanning = ref(false);
const lastPanPosition = ref({ x: 0, y: 0 });
const selectedLayers = ref([]);

const urlLayers = computed(() => {
  return layersStore.layers.filter(layer => layer.type === layersStore.LayerTypes.URL && layer.visible);
});

const onInit = (app) => {
  appRef.value = app;
};

function selectLayer(layerId) {
  selectedLayers.value = [layerId];
  layersStore.selectLayer(layerId);
}

function getCanvasPosition(clientX, clientY) {
  const canvasRect = containerRef.value?.getBoundingClientRect();
  if (!canvasRect) return null;
  return {
    x: (clientX - canvasRect.left) / zoom.value,
    y: (clientY - canvasRect.top) / zoom.value
  };
}

function drawCanvasBoundingBox(graphics) {
  if (!graphics) return;
  graphics.clear();
  graphics.lineStyle(1, 0x666666, 0.8);
  graphics.drawRect(0, 0, projectStore.canvasWidth, projectStore.canvasHeight);
}

function zoomIn() {
  zoom.value = Math.min(3, zoom.value * 1.2);
}

function zoomOut() {
  zoom.value = Math.max(0.25, zoom.value / 1.2);
}

function resetZoom() {
  zoom.value = 1;
  panX.value = 0;
  panY.value = 0;
}

function onWheel(event) {
  if (event.ctrlKey || event.metaKey) {
    event.deltaY < 0 ? zoomIn() : zoomOut();
    return;
  }
  if (event.shiftKey || event.buttons === 4) {
    const factor = 10 / zoom.value;
    if (event.deltaY !== 0) {
      panY.value += event.deltaY > 0 ? -factor : factor;
    }
    if (event.deltaX !== 0) {
      panX.value += event.deltaX > 0 ? -factor : factor;
    }
  }
}

function onCanvasMouseDown(event) {
  if (event.target !== containerRef.value && event.target !== appRef.value?.$el) {
    return;
  }
  if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
    isPanning.value = true;
    lastPanPosition.value = { x: event.clientX, y: event.clientY };
    
    const onMouseMove = (moveEvent) => {
      if (isPanning.value) {
        const dx = moveEvent.clientX - lastPanPosition.value.x;
        const dy = moveEvent.clientY - lastPanPosition.value.y;
        panX.value += dx / zoom.value;
        panY.value += dy / zoom.value;
        lastPanPosition.value = { x: moveEvent.clientX, y: moveEvent.clientY };
      }
    };
    const onMouseUp = () => {
      isPanning.value = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
}

const onLayerPointerDown = (event, layer) => {
  try {
    layersStore.selectLayer(layer.id);
    selectLayer(layer.id);
    const target = event.currentTarget || event.target;
    if (!target) return;

    let pointerPos;
    if (event.data && event.data.global) {
      pointerPos = event.data.global;
    } else if (event.global) {
      pointerPos = event.global;
    }
    if (!pointerPos) return;

    target._dragData = {
      layerId: layer.id,
      offsetX: pointerPos.x - layer.x,
      offsetY: pointerPos.y - layer.y,
      startX: layer.x,
      startY: layer.y,
      startWarpPoints: layer.warp?.points?.map(p => ({ ...p })) || []
    };

    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
    target.addEventListener('pointerupoutside', onPointerUp);
    if (typeof target.setPointerCapture === 'function') {
      target.setPointerCapture(event.pointerId);
    }
    event.stopPropagation();
  } catch (err) {
    console.error('Error in onLayerPointerDown:', err);
  }
};

function onPointerMove(event) {
  const target = event.currentTarget;
  if (!target || !target._dragData) return;

  const { layerId, offsetX, offsetY } = target._dragData;
  const layer = layersStore.layers.find(l => l.id === layerId);
  if (!layer) return;

  const pointerPos = event.data?.global || event.global;
  if (!pointerPos) return;

  const newX = pointerPos.x - offsetX;
  const newY = pointerPos.y - offsetY;
  const dx = newX - layer.x;
  const dy = newY - layer.y;

  layer.x = newX;
  layer.y = newY;
  if (layer.warp?.points) {
    layer.warp.points.forEach(p => {
      p.x += dx;
      p.y += dy;
    });
  }
}

function onPointerUp(event) {
  try {
    const target = event.currentTarget;
    if (!target || !target._dragData) return;
    const { layerId, startX, startY, startWarpPoints } = target._dragData;
    const layer = layersStore.layers.find(l => l.id === layerId);
    if (!layer) return;

    if (layer.x !== startX || layer.y !== startY) {
      const originalState = { x: startX, y: startY };
      const finalState = { x: layer.x, y: layer.y };
      if (layer.warp?.points) {
        originalState.warp = { ...layer.warp, points: startWarpPoints };
        finalState.warp = { ...layer.warp, points: layer.warp.points.map(p => ({...p}))};
      }
      const command = commandFactory.updateLayer(layerId, finalState, originalState);
      historyStore.pushCommand(command);
    }

    target._dragData = null;
    if (typeof target.releasePointerCapture === 'function') {
      target.releasePointerCapture(event.pointerId);
    }
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerup', onPointerUp);
    target.removeEventListener('pointerupoutside', onPointerUp);
  } catch (err) {
    console.error('Error in onPointerUp:', err);
  }
}

const warpPointOriginalPositions = ref({});

const updateWarpPoint = (index, position) => {
  if (selectedLayer.value?.warp?.enabled) {
    if (!warpPointOriginalPositions.value[index]) {
      warpPointOriginalPositions.value[index] = { ...selectedLayer.value.warp.points[index] };
    }
    if (selectedLayer.value.warp.points[index]) {
        selectedLayer.value.warp.points[index] = { ...position };
    }
  }
};

const finalizeWarpPointUpdate = (event) => {
  const { id } = event.detail;
  const parts = id.split('-');
  const index = parseInt(parts[parts.length - 1], 10);

  if (selectedLayer.value?.warp?.enabled && warpPointOriginalPositions.value[index]) {
    const layerId = selectedLayer.value.id;
    const newPosition = { ...selectedLayer.value.warp.points[index] };
    const oldPosition = warpPointOriginalPositions.value[index];

    if (newPosition.x !== oldPosition.x || newPosition.y !== oldPosition.y) {
      const command = commandFactory.updateWarpPoint(layerId, index, newPosition, oldPosition);
      historyStore.pushCommand(command);
    }
    delete warpPointOriginalPositions.value[index];
  }
};

onMounted(() => {
  window.addEventListener('warpHandlePointerUp', finalizeWarpPointUpdate);
});

onUnmounted(() => {
  window.removeEventListener('warpHandlePointerUp', finalizeWarpPointUpdate);
});

const drawSelectionOutline = (graphics) => {
  graphics.clear();
  const layer = selectedLayer.value;
  if (!layer) return;

  const points = layer.warp?.points;
  if (points?.length === 4) {
    graphics.lineStyle(2, 0x12B0FF, 1);
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();
  } else {
    graphics.lineStyle(1, 0x12B0FF, 0.8);
    const { x, y, width, height, scale, rotation = 0 } = layer;
    const w = width * (scale?.x || 1);
    const h = height * (scale?.y || 1);
    
    const corners = [
        { x: -w / 2, y: -h / 2 },
        { x: w / 2, y: -h / 2 },
        { x: w / 2, y: h / 2 },
        { x: -w / 2, y: h / 2 }
    ];

    const transformedCorners = corners.map(p => {
        const rotatedX = p.x * Math.cos(rotation) - p.y * Math.sin(rotation);
        const rotatedY = p.x * Math.sin(rotation) + p.y * Math.cos(rotation);
        return { x: rotatedX + x, y: rotatedY + y };
    });
    
    graphics.moveTo(transformedCorners[0].x, transformedCorners[0].y);
    graphics.lineTo(transformedCorners[1].x, transformedCorners[1].y);
    graphics.lineTo(transformedCorners[2].x, transformedCorners[2].y);
    graphics.lineTo(transformedCorners[3].x, transformedCorners[3].y);
    graphics.closePath();
  }
};

</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #121212;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-wrapper {
  position: relative;
  transition: transform 0.1s ease-out;
}

.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  padding: 4px 8px;
  z-index: 100;
}

.zoom-button {
  width: 24px;
  height: 24px;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin: 0 2px;
}

.zoom-button:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.2);
}

.zoom-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-button.fit {
  width: auto;
  padding: 0 8px;
  font-size: 12px;
}

.zoom-level {
  color: white;
  font-size: 12px;
  margin: 0 8px;
  min-width: 40px;
  text-align: center;
}

.iframe-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Let clicks pass through to the canvas */
  transform-origin: 0 0;
}
</style>