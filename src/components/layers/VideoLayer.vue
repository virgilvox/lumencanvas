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
import { ref, watch, onUnmounted, nextTick } from 'vue';
import * as PIXI from 'pixi.js';
import { videoManager } from '../../services/videoManager.js';

const props = defineProps({
  layer: { type: Object, required: true },
});

const emit = defineEmits(['pointerdown']);

const texture = ref(PIXI.Texture.WHITE);
const videoElement = ref(null);
const state = ref(null);
const shader = ref(null);
const geometry = ref(null);
const isBlocked = ref(false);

function getBlendMode(mode) {
  const modes = {
    normal: PIXI.BLEND_MODES.NORMAL,
    add: PIXI.BLEND_MODES.ADD,
    screen: PIXI.BLEND_MODES.SCREEN,
    multiply: PIXI.BLEND_MODES.MULTIPLY,
  };
  return modes[mode] ?? PIXI.BLEND_MODES.NORMAL;
}

function attemptPlay() {
  if (videoElement.value) {
    const playPromise = videoElement.value.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        if (error.name === 'NotAllowedError') {
          isBlocked.value = true;
          window.addEventListener('pointerdown', handleBlockedPlayback, { once: true });
        }
      });
    }
  }
}

function handleBlockedPlayback() {
  if (isBlocked.value && videoElement.value) {
    videoElement.value.play().then(() => {
      isBlocked.value = false;
      if (texture.value?.baseTexture) {
         texture.value.baseTexture.update();
      }
    }).catch(err => {
      console.warn("Playback still blocked after interaction.", err);
    });
  }
}

async function setupVideo() {
  if (videoElement.value) {
    videoManager.release(videoElement.value.src);
    videoElement.value = null;
  }
  if (texture.value && texture.value !== PIXI.Texture.WHITE) {
    texture.value.destroy();
  }

  if (props.layer.content?.src) {
    try {
      videoElement.value = videoManager.get(props.layer.content.src);
      videoElement.value.loop = props.layer.content.loop ?? true;
      videoElement.value.volume = props.layer.properties?.volume ?? 1;
      videoElement.value.playbackRate = props.layer.properties?.playbackRate ?? 1;
      
      texture.value = PIXI.Texture.from(videoElement.value);

      if (props.layer.content.playing) {
        await nextTick(); // Ensure video element is ready
        attemptPlay();
      }
      
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
  
  const { x = 0, y = 0, width = 0, height = 0, scale = {x: 1, y: 1}, rotation = 0 } = props.layer;
  const w = width * (scale?.x || 1);
  const h = height * (scale?.y || 1);

  const corners = [
      { x: -w / 2, y: -h / 2 }, { x:  w / 2, y: -h / 2 },
      { x:  w / 2, y:  h / 2 }, { x: -w / 2, y:  h / 2 }
  ];

  const rad = rotation * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return corners.flatMap(p => {
      const rotatedX = p.x * cos - p.y * sin;
      const rotatedY = p.x * sin + p.y * cos;
      return [rotatedX + x, rotatedY + y];
  });
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

function updateGeometry() {
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
watch(() => props.layer.warp, updateGeometry, { deep: true });
watch(() => [props.layer.x, props.layer.y, props.layer.width, props.layer.height, props.layer.scale, props.layer.rotation], updateGeometry, { deep: true });

// Watch for property changes on the existing video element
watch(() => props.layer.content?.playing, (playing) => {
  if (videoElement.value) {
    videoManager.setPlaybackIntention(videoElement.value, playing);
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
    state.value = new PIXI.State();
    state.value.blend = true;
  }
}, { immediate: true });

// Watch for changes that require video re-setup (like changing the src)
watch(() => props.layer.content?.src, setupVideo, { immediate: true });

onUnmounted(() => {
  window.removeEventListener('pointerdown', handleBlockedPlayback);
  if (videoElement.value) {
    videoManager.release(videoElement.value.src);
    videoElement.value = null;
  }
  if (texture.value && texture.value !== PIXI.Texture.WHITE) {
    texture.value.destroy();
  }
  if (geometry.value) geometry.value.destroy();
});

</script>