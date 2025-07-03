<template>
  <!-- Warped video uses an explicit Geometry to avoid Pixi buffer errors -->
  <mesh
    v-if="geometry"
    :shader="shader"
    :state="state"
    :geometry="geometry"
    :blendMode="getBlendMode(layer.blendMode)"
    :alpha="layer.opacity"
    event-mode="static"
    @pointerdown="$emit('pointerdown', $event)"
  />
</template>

<script setup>
import { ref, watch, onUnmounted, watchEffect } from 'vue';
import * as PIXI from 'pixi.js';

const props = defineProps({
  layer: { type: Object, required: true },
});

const emit = defineEmits(['pointerdown']);

const texture = ref(PIXI.Texture.WHITE);
const videoElement = ref(null);
const state = ref(null);
const shader = ref(null);
// Explicit geometry object for warped quad
const geometry = ref(null);

function getBlendMode(mode) {
  const modes = {
    normal: PIXI.BLEND_MODES.NORMAL,
    add: PIXI.BLEND_MODES.ADD,
    screen: PIXI.BLEND_MODES.SCREEN,
    multiply: PIXI.BLEND_MODES.MULTIPLY,
  };
  return modes[mode] ?? PIXI.BLEND_MODES.NORMAL;
}

// This function creates/updates the video element and its texture
async function setupVideo() {
  // Cleanup old video element if it exists
  if (videoElement.value) {
    videoElement.value.pause();
    videoElement.value = null;
    if (texture.value && texture.value !== PIXI.Texture.WHITE) {
      texture.value.destroy();
    }
  }

  if (props.layer.content?.src) {
    try {
      const video = document.createElement('video');
      video.src = props.layer.content.src;
      video.crossOrigin = 'anonymous';
      video.loop = props.layer.content.loop ?? true;
      video.muted = true; // Essential for autoplay in most browsers
      video.volume = props.layer.properties?.volume ?? 1;
      video.playbackRate = props.layer.properties?.playbackRate ?? 1;
      
      videoElement.value = video;
      
      await video.play();
      texture.value = PIXI.Texture.from(video);

    } catch (error) {
      console.error('Failed to load video:', error);
      texture.value = PIXI.Texture.WHITE;
    }
  } else {
    texture.value = PIXI.Texture.WHITE;
  }
}

function buildVertices() {
  if (props.layer.warp?.points && props.layer.warp.points.length === 4) {
    return props.layer.warp.points.flatMap(p => [p.x, p.y]);
  }
  const { x = 0, y = 0, width = 0, height = 0 } = props.layer;
  return [
    x - width / 2, y - height / 2,
    x + width / 2, y - height / 2,
    x + width / 2, y + height / 2,
    x - width / 2, y + height / 2,
  ];
}

function getQuadIndices(points) {
  if (!points || points.length !== 4) return [0, 1, 2, 0, 2, 3];
  const p = points;
  const d02_sq = Math.pow(p[2].x - p[0].x, 2) + Math.pow(p[2].y - p[0].y, 2);
  const d13_sq = Math.pow(p[3].x - p[1].x, 2) + Math.pow(p[3].y - p[1].y, 2);
  return d13_sq < d02_sq 
    ? [0, 1, 3, 1, 2, 3] 
    : [0, 1, 2, 0, 2, 3];
}

function updateGeometry () {
  const verts = buildVertices();
  const uvs   = [0,0, 1,0, 1,1, 0,1];
  const indices = getQuadIndices(props.layer.warp?.points);

  if (!geometry.value) {
    geometry.value = new PIXI.Geometry()
      .addAttribute('aVertexPosition', verts, 2)
      .addAttribute('aTextureCoord',  uvs,   2)
      .addIndex(indices);
  } else {
    geometry.value.getBuffer('aVertexPosition').update(new Float32Array(verts));
    geometry.value.getBuffer('aTextureCoord') .update(new Float32Array(uvs));
    geometry.value.getIndex().update(new Uint16Array(indices));
  }
}

updateGeometry();

// Reactively update geometry when warp points or layer transform change
watch(() => props.layer.warp?.points, updateGeometry, { deep: true });
watch(() => [props.layer.x, props.layer.y, props.layer.width, props.layer.height], updateGeometry);

// Watch for property changes on the existing video element
watch(() => props.layer.content?.playing, (playing) => {
  if (videoElement.value) {
    playing ? videoElement.value.play().catch(console.error) : videoElement.value.pause();
  }
});

watch(() => props.layer.content?.loop, (loop) => {
  if (videoElement.value) videoElement.value.loop = loop;
});

watch(() => props.layer.properties?.volume, (volume) => {
  if (videoElement.value) videoElement.value.volume = volume;
});

watch(() => props.layer.properties?.playbackRate, (rate) => {
  if (videoElement.value) videoElement.value.playbackRate = rate;
});

// Update shader when texture changes
watch(texture, (newTexture) => {
  if (newTexture) {
    shader.value = new PIXI.MeshMaterial(newTexture);
  }
}, { immediate: true });

// Watch for changes that require video re-setup (like changing the src)
watch(() => props.layer.content?.src, setupVideo, { immediate: true });

onUnmounted(() => {
  if (videoElement.value) {
    videoElement.value.pause();
    videoElement.value.src = ''; // Release resource
    videoElement.value = null;
  }
  if (texture.value && texture.value !== PIXI.Texture.WHITE) {
    texture.value.destroy();
  }
  if (geometry.value) geometry.value.destroy();
});

</script>