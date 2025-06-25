<template>
  <div class="canvas-container" ref="containerRef">
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
import { ref, computed, onMounted } from 'vue';
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

const onInit = (pixiApp) => {
  appRef.value = pixiApp;
  pixiApp.stage.eventMode = 'static';
  pixiApp.stage.hitArea = pixiApp.screen;

  // Add global mouse listeners for dragging
  pixiApp.stage.on('pointermove', onDragMove);
  pixiApp.stage.on('pointerup', onDragEnd);
  pixiApp.stage.on('pointerupoutside', onDragEnd);
};

const onLayerPointerDown = (event, layer) => {
  if (!appRef.value) {
    console.error("onLayerPointerDown called before Pixi app was initialized.");
    return;
  }
  layersStore.selectLayer(layer.id);
  
  const stage = appRef.value.stage;
  const localPos = stage.toLocal(event.data.global);
  const offsetX = localPos.x - layer.x;
  const offsetY = localPos.y - layer.y;

  dragData.value = {
    layerId: layer.id,
    type: 'layer',
    offsetX,
    offsetY,
  };

  event.stopPropagation();
};

const onDragMove = (event) => {
  if (!dragData.value || dragData.value.type !== 'layer' || !appRef.value) return;

  const layer = layersStore.layers.find(l => l.id === dragData.value.layerId);
  if (!layer) return;

  const stage = appRef.value.stage;
  const localPos = stage.toLocal(event.data.global);
  const newX = localPos.x - dragData.value.offsetX;
  const newY = localPos.y - dragData.value.offsetY;
  const dx = newX - layer.x;
  const dy = newY - layer.y;

  const updatedLayer = {
    x: newX,
    y: newY,
  };

  if (layer.warp && layer.warp.points) {
    updatedLayer.warp = {
      ...layer.warp,
      points: layer.warp.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
    };
  }
  
  layersStore.updateLayer(layer.id, updatedLayer);
};

const onDragEnd = () => {
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