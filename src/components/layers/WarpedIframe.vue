<template>
  <div 
    v-if="layer.visible && layer.type === 'url'"
    class="warped-iframe-container"
    :style="containerStyle"
  >
    <iframe
      :src="layer.content.url"
      class="warped-iframe"
      frameborder="0"
      :style="iframeStyle"
    ></iframe>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getTransform } from '../../utils/matrix.js';

const props = defineProps({
  layer: { type: Object, required: true },
  canvasWidth: { type: Number, required: true },
  canvasHeight: { type: Number, required: true },
});

const containerStyle = computed(() => ({
  position: 'absolute',
  top: '0',
  left: '0',
  width: `${props.canvasWidth}px`,
  height: `${props.canvasHeight}px`,
  pointerEvents: 'none',
}));

const iframeStyle = computed(() => {
    const { layer } = props;
    if (!layer) return { display: 'none' };

    // If warp points are defined, always use them for the transform
    if (layer.warp?.points?.length === 4) {
        const from = [
            { x: 0, y: 0 },
            { x: layer.width, y: 0 },
            { x: layer.width, y: layer.height },
            { x: 0, y: layer.height },
        ];
        const matrix = getTransform(from, layer.warp.points);

        if (!matrix) return { display: 'none' };

        return {
            position: 'absolute',
            top: '0px',
            left: '0px',
            width: `${layer.width}px`,
            height: `${layer.height}px`,
            transform: `matrix3d(${matrix.join(',')})`,
            transformOrigin: '0 0',
            pointerEvents: layer.properties?.interactive ? 'auto' : 'none'
        };
    }
    // Fallback to standard transform if no warp points exist
    else {
        return {
            position: 'absolute',
            left: `${layer.x}px`,
            top: `${layer.y}px`,
            width: `${layer.width}px`,
            height: `${layer.height}px`,
            transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg) scale(${layer.scale?.x || 1}, ${layer.scale?.y || 1})`,
            transformOrigin: 'center center',
            pointerEvents: layer.properties?.interactive ? 'auto' : 'none'
        };
    }
});

</script>

<style scoped>
.warped-iframe-container {
  overflow: hidden;
}
.warped-iframe {
  border: none;
}
</style> 