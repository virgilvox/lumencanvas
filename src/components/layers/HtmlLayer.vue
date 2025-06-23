<template>
  <ForeignObject
    :x="layer.position.x - width/2"
    :y="layer.position.y - height/2"
    :width="width"
    :height="height"
    :scale="layer.scale"
    :rotation="layer.rotation"
    :alpha="layer.opacity"
  >
    <div class="html-container">
      <iframe
        :srcdoc="sandboxedHtml"
        :style="iframeStyle"
        sandbox="allow-scripts"
        frameborder="0"
      />
    </div>
  </ForeignObject>
</template>

<script setup>
import { computed, ref } from 'vue';
import { ForeignObject } from 'vue3-pixi';

const props = defineProps({
  layer: {
    type: Object,
    required: true
  },
  canvasSize: {
    type: Object,
    default: () => ({ width: 800, height: 600 })
  }
});

const width = ref(400);
const height = ref(300);

// Create sandboxed HTML with basic styles
const sandboxedHtml = computed(() => {
  const baseStyles = `
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family: system-ui, -apple-system, sans-serif;
        color: white;
        background: transparent;
        padding: 20px;
        overflow: hidden;
      }
    </style>
  `;
  
  return baseStyles + (props.layer.content.html || '');
});

const iframeStyle = computed(() => ({
  width: '100%',
  height: '100%',
  background: 'transparent',
  pointerEvents: props.layer.properties.interactive ? 'auto' : 'none'
}));
</script>

<style scoped>
.html-container {
  width: 100%;
  height: 100%;
  position: relative;
}

iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>