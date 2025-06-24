<template>
  <div ref="container" class="canvas-area">
    <Application 
      :resize-to="container" 
      :background-alpha="1" 
      background-color="#111"
      @render="onRender"
    >
      <!-- Layer Container with mask -->
      <container>
        <LayerRenderer
          v-for="layer in visibleLayers"
          :key="layer.id"
          :layer="layer"
          :canvas-size="canvasSize"
          @request-edit="handleRequestEdit"
        />
      </container>
      
      <!-- Warp quad outline (always on top) -->
      <graphics :draw="drawOutline" />
      
      <!-- Warp handles -->
      <template v-if="selectedLayer">
        <WarpHandle
          v-for="(pt, idx) in warpPoints"
          :key="pt.id"
          :id="pt.id"
          :x="pt.x"
          :y="pt.y"
          @update:position="pos => updateWarpPoint(idx, pos)"
        />
      </template>
    </Application>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import * as PIXI from 'pixi.js';
import { storeToRefs } from 'pinia';
import { useLayersStore } from '../store/layers';
import { useProjectStore } from '../store/project';
import WarpHandle from './WarpHandle.vue';
import LayerRenderer from './layers/LayerRenderer.vue';
import { Application } from 'vue3-pixi';

const container = ref(null);
const canvasSize = ref({ width: 800, height: 600 });

// Layer store
const layersStore = useLayersStore();
const { visibleLayers, selectedLayer } = storeToRefs(layersStore);

// Project store
const projectStore = useProjectStore();
const { warpPoints: points } = storeToRefs(projectStore);

// Create mask for the warped quad
const quadMask = computed(() => {
  const mask = new PIXI.Graphics();
  const pts = points.value;
  
  mask.clear();
  mask.beginFill(0xffffff);
  mask.moveTo(pts[0].x, pts[0].y);
  mask.lineTo(pts[1].x, pts[1].y);
  mask.lineTo(pts[2].x, pts[2].y);
  mask.lineTo(pts[3].x, pts[3].y);
  mask.closePath();
  mask.endFill();
  
  return mask;
});

const updatePoint = (index, newPosition) => {
  const newPoints = [...points.value];
  newPoints[index] = newPosition;
  projectStore.updateWarpPoints(newPoints);
};

const drawOutline = (g) => {
  const pts = points.value;
  g.clear();
  g.lineStyle(1.5, 0x12B0FF, 1); // Use accent color for the outline
  
  g.moveTo(pts[0].x, pts[0].y);
  g.lineTo(pts[1].x, pts[1].y);
  g.lineTo(pts[2].x, pts[2].y);
  g.lineTo(pts[3].x, pts[3].y);
  g.closePath();
};

const handleRequestEdit = (layer) => {
  // Emit event up to parent
  emit('request-edit', layer);
};

const emit = defineEmits(['request-edit']);

const onRender = () => {
  // Update canvas size if needed
  if (container.value) {
    const rect = container.value.getBoundingClientRect();
    if (rect.width !== canvasSize.value.width || rect.height !== canvasSize.value.height) {
      canvasSize.value = { width: rect.width, height: rect.height };
    }
  }
};

// Compute warp points for the selected layer (corners)
const warpPoints = computed(() => {
  const layer = selectedLayer.value;
  if (!layer) return [];
  const { x, y } = layer.position;
  const { x: sx, y: sy } = layer.scale;
  const w = 100 * sx, h = 100 * sy; // Assume 100x100 default size, scale accordingly
  // Top-left, top-right, bottom-right, bottom-left
  return [
    { id: 'tl', x: x - w/2, y: y - h/2 },
    { id: 'tr', x: x + w/2, y: y - h/2 },
    { id: 'br', x: x + w/2, y: y + h/2 },
    { id: 'bl', x: x - w/2, y: y + h/2 },
  ];
});

function updateWarpPoint(idx, pos) {
  // TODO: Actually update the layer's warp points/perspective
  // For now, just update position for demo
  // You may want to store warp points in the layer object
}

onMounted(() => {
  // Update canvas size
  if (container.value) {
    const rect = container.value.getBoundingClientRect();
    canvasSize.value = { width: rect.width, height: rect.height };
  }
  
  // Enable global file drop
  const canvasArea = container.value;
  if (canvasArea) {
    canvasArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    
    canvasArea.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const layer = layersStore.addLayer(layersStore.LayerTypes.IMAGE);
          // The layer component will handle the file
        } else if (file.type.startsWith('video/')) {
          const layer = layersStore.addLayer(layersStore.LayerTypes.VIDEO);
          // The layer component will handle the file
        }
      });
    });
  }
});
</script>

<style scoped>
.canvas-area {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
</style> 