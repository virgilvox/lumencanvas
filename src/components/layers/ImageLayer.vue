<template>
  <Sprite
    v-if="texture"
    :texture="texture"
    :anchor="0.5"
    :x="layer.position.x"
    :y="layer.position.y"
    :scale="layer.scale"
    :rotation="layer.rotation"
    :alpha="layer.opacity"
    :blend-mode="getBlendMode(layer.blendMode)"
  />
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { Sprite } from 'vue3-pixi';
import * as PIXI from 'pixi.js';

const props = defineProps({
  layer: {
    type: Object,
    required: true
  }
});

const texture = ref(null);

function getBlendMode(mode) {
  const modes = {
    normal: 'normal',
    add: 'add',
    screen: 'screen',
    multiply: 'multiply'
  };
  return modes[mode] || 'normal';
}

async function loadTexture() {
  if (props.layer.content.src) {
    try {
      texture.value = await PIXI.Assets.load(props.layer.content.src);
    } catch (error) {
      console.error('Failed to load image:', error);
    }
  }
}

// Handle file drops
function handleFileDrop(file) {
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      props.layer.content.src = e.target.result;
      loadTexture();
    };
    reader.readAsDataURL(file);
  }
}

watch(() => props.layer.content.src, loadTexture);

onMounted(() => {
  loadTexture();
  
  // Listen for file drops if this is the selected layer
  window.addEventListener('drop', handleDropEvent);
  window.addEventListener('dragover', handleDragOver);
});

onUnmounted(() => {
  window.removeEventListener('drop', handleDropEvent);
  window.removeEventListener('dragover', handleDragOver);
});

function handleDropEvent(e) {
  e.preventDefault();
  if (props.layer.selected) {
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileDrop(file);
    }
  }
}

function handleDragOver(e) {
  e.preventDefault();
}
</script>