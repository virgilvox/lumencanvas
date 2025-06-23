<template>
  <div ref="container" class="canvas-area">
    <Application :resize-to="container" :background-alpha="1" background-color="#111">
      <Graphics :draw="draw" />
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
import { ref, onMounted } from 'vue';
import { Application } from 'vue3-pixi';
import WarpHandle from './WarpHandle.vue';

const container = ref(null);

// Make the points reactive
const points = ref([
  { x: 100, y: 100 },
  { x: 400, y: 100 },
  { x: 450, y: 400 },
  { x: 50, y: 350 },
]);

const updatePoint = (index, newPosition) => {
  points.value[index] = newPosition;
};

const draw = (g) => {
  const pts = points.value; // Get the array from the ref
  g.clear();
  g.beginFill(0x12B0FF, 0.2); // Use accent color from PRD with some transparency
  g.lineStyle(1.5, 0x12B0FF, 1); // Use accent color for the line
  
  g.moveTo(pts[0].x, pts[0].y);
  g.lineTo(pts[1].x, pts[1].y);
  g.lineTo(pts[2].x, pts[2].y);
  g.lineTo(pts[3].x, pts[3].y);
  g.closePath();
  
  g.endFill();
};

onMounted(() => {
  // This is a bit of a trick to get the container reference for resize-to
  // We need to get the parent element of the Vue component's root
  const canvasAreaDiv = document.querySelector('.canvas-area');
  if (canvasAreaDiv) {
    container.value = canvasAreaDiv;
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