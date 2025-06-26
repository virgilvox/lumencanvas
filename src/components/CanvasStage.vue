<template>
  <div 
    class="canvas-container" 
    ref="containerRef"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
  >
    <Application
      ref="appRef"
      :width="projectStore.canvasWidth"
      :height="projectStore.canvasHeight"
      :background="0x000000"
      :antialias="true"
      @init="onInit"
    >
      <container>
        <!-- Render each layer using LayerRenderer -->
        <LayerRenderer
          v-for="layer in layers"
          :key="layer.id"
          :layer="layer"
          :canvas-size="{ width: projectStore.canvasWidth, height: projectStore.canvasHeight }"
          @pointerdown="onLayerPointerDown($event, layer)"
          @request-edit="$emit('requestEdit', layer)"
        />

        <!-- Selection outline and warp handles -->
        <container v-if="selectedLayer && selectedLayer.warp?.enabled">
          <graphics @render="drawSelectionOutline" />
          <container v-if="selectedLayer.warp?.enabled">
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
    </Application>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { Application } from 'vue3-pixi';
import { useLayersStore } from '../store/layers';
import { useProjectStore } from '../store/project';
import LayerRenderer from './layers/LayerRenderer.vue';
import WarpHandle from './WarpHandle.vue';

const layersStore = useLayersStore();
const projectStore = useProjectStore();
const { layers, selectedLayer } = storeToRefs(layersStore);

const appRef = ref(null);
const dragData = ref(null);
const containerRef = ref(null);

// This initialization function just initializes the app
const onInit = (app) => {
  appRef.value = app;
  console.log("Pixi application initialized:", app);
};

// Convert screen coordinates to canvas coordinates
function getCanvasPosition(clientX, clientY) {
  const canvasRect = containerRef.value?.getBoundingClientRect();
  if (!canvasRect) return null;
  
  return {
    x: clientX - canvasRect.left,
    y: clientY - canvasRect.top
  };
}

const onLayerPointerDown = (event, layer) => {
  try {
    // Select the layer
    layersStore.selectLayer(layer.id);
    console.log("Layer pointer down event type:", event.type);
    
    // Get global mouse position
    let globalPos;
    
    if (event.data && event.data.global) {
      globalPos = event.data.global;
      console.log("Using event.data.global:", globalPos);
    } else if (event.global) {
      globalPos = event.global;
      console.log("Using event.global:", globalPos);
    } else if (event.nativeEvent) {
      globalPos = getCanvasPosition(event.nativeEvent.clientX, event.nativeEvent.clientY);
      if (globalPos) console.log("Using nativeEvent coordinates:", globalPos);
    } else if (event.originalEvent) {
      globalPos = getCanvasPosition(event.originalEvent.clientX, event.originalEvent.clientY);
      if (globalPos) console.log("Using originalEvent coordinates:", globalPos);
    } else {
      // Last resort: try to get from DOM event
      const mouseEvent = event.originalEvent || event.nativeEvent || event;
      if (mouseEvent.clientX !== undefined) {
        globalPos = getCanvasPosition(mouseEvent.clientX, mouseEvent.clientY);
        if (globalPos) console.log("Using mouseEvent coordinates:", globalPos);
      }
    }

    if (!globalPos) {
      console.error('Pointer event missing global position. Event structure:', event);
      return;
    }

    // Calculate offset between mouse position and layer position
    const offsetX = globalPos.x - layer.x;
    const offsetY = globalPos.y - layer.y;

    // Start dragging
    dragData.value = {
      layerId: layer.id,
      type: 'layer',
      offsetX,
      offsetY,
      startX: globalPos.x,
      startY: globalPos.y
    };

    console.log("Started dragging layer:", layer.id, "at offset:", offsetX, offsetY);
    
    // Prevent further event propagation 
    if (event.stopPropagation) event.stopPropagation();
    if (event.preventDefault) event.preventDefault();
  } catch (err) {
    console.error("Error in onLayerPointerDown:", err);
  }
};

// Handle DOM mouse move event (attached to container div)
const onMouseMove = (event) => {
  if (!dragData.value || dragData.value.type !== 'layer') return;
  
  try {
    const layer = layersStore.layers.find(l => l.id === dragData.value.layerId);
    if (!layer) return;

    // Get current mouse position relative to canvas
    const mousePos = getCanvasPosition(event.clientX, event.clientY);
    if (!mousePos) return;
    
    console.log("Mouse move at:", mousePos.x, mousePos.y);
    
    // Calculate new position
    const newX = mousePos.x - dragData.value.offsetX;
    const newY = mousePos.y - dragData.value.offsetY;
    const dx = newX - layer.x;
    const dy = newY - layer.y;

    // Create updated layer data
    const updatedLayer = {
      x: newX,
      y: newY,
    };

    // Also update warp points if they exist
    if (layer.warp && layer.warp.points) {
      updatedLayer.warp = {
        ...layer.warp,
        points: layer.warp.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
      };
    }
    
    // Update the layer position - same function that properties panel uses
    layersStore.updateLayer(layer.id, updatedLayer);
    
    console.log(`Layer moved to ${newX}, ${newY}`);
  } catch (err) {
    console.error("Error in onMouseMove:", err);
  }
};

// Handle DOM mouse up event (attached to container div)
const onMouseUp = (event) => {
  if (!dragData.value) return;
  
  console.log("Finished dragging layer:", dragData.value.layerId);
  dragData.value = null;
};

const updateWarpPoint = (index, position) => {
  if (selectedLayer.value?.warp?.enabled) {
    const newPoints = [...selectedLayer.value.warp.points];
    newPoints[index] = { x: position.x, y: position.y };
    layersStore.updateLayer(selectedLayer.value.id, {
      warp: { ...selectedLayer.value.warp, points: newPoints }
    });
  }
};

const drawSelectionOutline = (graphics) => {
  const layer = selectedLayer.value;
  if (!layer?.warp?.enabled) {
    graphics.clear();
    return;
  }

  const points = layer.warp.points;
  if (!points?.length) return;

  graphics.clear();
  graphics.lineStyle(2, 0x12B0FF, 1);
  graphics.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    graphics.lineTo(points[i].x, points[i].y);
  }
  graphics.closePath();
};

// Enable edit mode by default on mount
onMounted(() => {
  if (selectedLayer.value && !selectedLayer.value.warp?.enabled) {
    layersStore.updateLayer(selectedLayer.value.id, {
      warp: { ...selectedLayer.value.warp, enabled: true },
    });
  }
});
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000000;
  overflow: hidden;
}
</style> 