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
    <div class="url-container">
      <iframe
        :src="layer.content.url"
        :style="iframeStyle"
        :scrolling="layer.properties.scrollable ? 'auto' : 'no'"
        frameborder="0"
        allowfullscreen
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

const width = ref(600);
const height = ref(400);

const iframeStyle = computed(() => ({
  width: '100%',
  height: '100%',
  background: 'white',
  pointerEvents: props.layer.properties.interactive ? 'auto' : 'none'
}));
</script>

<style scoped>
.url-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: white;
  border-radius: 4px;
}

iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>