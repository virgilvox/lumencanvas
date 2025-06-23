<template>
  <div ref="container" class="canvas-area">
    <Application 
      :resize-to="container" 
      :background-alpha="1" 
      background-color="#111"
      @render="onRender"
    >
      <!-- Layer Container with mask -->
      <Container :mask="quadMask">
        <LayerRenderer
          v-for="layer in visibleLayers"
          :key="layer.id"
          :layer="layer"
          :canvas-size="canvasSize"
          @request-edit="handleRequestEdit"
        />
      </Container>
      
      <!-- Warp quad outline (always on top) -->
      <Graphics :draw="drawOutline" />
      
      <!-- Warp handles -->
      <WarpHandle
        v-for="(p, i) in points"
        :key="i"
        :id="`handle-${i}`"
        :x="p.x"
        :y="p.y"
        @update:position="updatePoint(i, $event)"
      />
    </Application>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { Application, Container, Graphics } from 'vue3-pixi';
import * as PIXI from 'pixi.js';
import { storeToRefs } from 'pinia';
import { useLayersStore } from '../store/layers';
import WarpHandle from './WarpHandle.vue';
import LayerRenderer from './layers/LayerRenderer.vue';

const container = ref(null);
const canvasSize = ref({ width: 800, height: 600 });

// Layer store
const layersStore = useLayersStore();
const { visibleLayers } = storeToRefs(layersStore);

// Make the points reactive
const points = ref([
  { x: 100, y: 100 },
  { x: 400, y: 100 },
  { x: 450, y: 400 },
  { x: 50, y: 350 },
]);

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
  points.value[index] = newPosition;
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
  // TODO: Open Monaco editor for this layer
  console.log('Request edit for layer:', layer);
};

const onRender = () => {
  // Update canvas size if needed
  if (container.value) {
    const rect = container.value.getBoundingClientRect();
    if (rect.width !== canvasSize.value.width || rect.height !== canvasSize.value.height) {
      canvasSize.value = { width: rect.width, height: rect.height };
    }
  }
};

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