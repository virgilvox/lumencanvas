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
const videoElement = ref(null);

function getBlendMode(mode) {
  const modes = {
    normal: 'normal',
    add: 'add',
    screen: 'screen',
    multiply: 'multiply'
  };
  return modes[mode] || 'normal';
}

async function loadVideo() {
  if (props.layer.content.src) {
    try {
      // Create video element
      const video = document.createElement('video');
      video.src = props.layer.content.src;
      video.crossOrigin = 'anonymous';
      video.loop = props.layer.content.loop;
      video.muted = true; // Required for autoplay
      video.volume = props.layer.properties.volume || 1;
      video.playbackRate = props.layer.properties.playbackRate || 1;
      
      videoElement.value = video;
      
      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve;
        video.onerror = reject;
      });
      
      // Create texture from video
      texture.value = PIXI.Texture.from(video);
      
      // Start playing if enabled
      if (props.layer.content.playing) {
        video.play().catch(console.error);
      }
    } catch (error) {
      console.error('Failed to load video:', error);
    }
  }
}

// Update video properties
watch(() => props.layer.content.playing, (playing) => {
  if (videoElement.value) {
    if (playing) {
      videoElement.value.play().catch(console.error);
    } else {
      videoElement.value.pause();
    }
  }
});

watch(() => props.layer.content.loop, (loop) => {
  if (videoElement.value) {
    videoElement.value.loop = loop;
  }
});

watch(() => props.layer.properties.volume, (volume) => {
  if (videoElement.value) {
    videoElement.value.volume = volume;
  }
});

watch(() => props.layer.properties.playbackRate, (rate) => {
  if (videoElement.value) {
    videoElement.value.playbackRate = rate;
  }
});

// Handle file drops
function handleFileDrop(file) {
  if (file.type.startsWith('video/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      props.layer.content.src = e.target.result;
      loadVideo();
    };
    reader.readAsDataURL(file);
  }
}

watch(() => props.layer.content.src, loadVideo);

onMounted(() => {
  loadVideo();
  
  // Listen for file drops if this is the selected layer
  window.addEventListener('drop', handleDropEvent);
  window.addEventListener('dragover', handleDragOver);
});

onUnmounted(() => {
  // Clean up video element
  if (videoElement.value) {
    videoElement.value.pause();
    videoElement.value.src = '';
  }
  
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