<template>
  <div class="canvas-area">
    <Application :resize-to="container" :background-alpha="1" background-color="#111">
      <!-- Pixi.js content will be rendered here -->
    </Application>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { Application } from 'vue3-pixi';

const container = ref(null);

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
  flex-grow: 1;
  background-color: #222;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden; /* Ensure canvas doesn't overflow */
}

.canvas-area > :deep(canvas) {
  position: absolute;
  top: 0;
  left: 0;
}
</style> 