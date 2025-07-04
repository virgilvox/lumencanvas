<template>
  <mesh
    v-if="geometry && shader"
    :shader="shader"
    :state="state"
    :geometry="geometry"
    :blendMode="getBlendMode(layer.blendMode)"
    :alpha="layer.opacity"
    event-mode="static"
    @pointerdown="$emit('pointerdown', $event)"
  />
  <!-- Note: Actual HTML rendering on a warped surface is a complex feature for later. This placeholder ensures consistent interaction. -->
</template>

<script setup>
import * as PIXI from 'pixi.js';
import { ref, watch, onMounted, onUnmounted, watchEffect } from 'vue';

const props = defineProps({
  layer: { type: Object, required: true },
});

const emit = defineEmits(['pointerdown']);

const texture = ref(PIXI.Texture.WHITE);
const geometry = ref(null);
const shader = ref(null);
const state = ref(null);

function getBlendMode(mode) {
  const modes = {
    normal: PIXI.BLEND_MODES.NORMAL,
    add: PIXI.BLEND_MODES.ADD,
    screen: PIXI.BLEND_MODES.SCREEN,
    multiply: PIXI.BLEND_MODES.MULTIPLY,
  };
  return modes[mode] ?? PIXI.BLEND_MODES.NORMAL;
}

watchEffect(async () => {
  const html = props.layer.content?.html;
  if (html) {
    const width = props.layer.width || 200;
    const height = props.layer.height || 200;
    
    // Construct the SVG with foreignObject
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width: ${width}px; height: ${height}px; background-color: transparent; color: white; font-family: sans-serif;">
            ${html}
          </div>
        </foreignObject>
      </svg>
    `;

    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

    try {
      if (texture.value && texture.value.textureCacheIds) {
        texture.value.textureCacheIds.forEach(id => {
          if (id.startsWith('data:image/svg+xml')) {
            PIXI.Texture.removeFromCache(id);
            PIXI.BaseTexture.removeFromCache(id);
          }
        });
      }
      texture.value = await PIXI.Assets.load(dataUrl);
    } catch (e) {
      console.error(`Failed to load HTML texture for layer ${props.layer.id}:`, e);
      texture.value = PIXI.Texture.WHITE;
    }
  } else {
    texture.value = PIXI.Texture.WHITE;
  }
});

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

function updateGeometry () {
  const verts = buildVertices();
  const uvs   = [0,0, 1,0, 1,1, 0,1];
  const indices = getQuadIndices(props.layer.warp?.points || []);

  if (!geometry.value) {
    geometry.value = new PIXI.Geometry()
      .addAttribute('aVertexPosition', verts, 2)
      .addAttribute('aTextureCoord', uvs, 2)
      .addIndex(indices);
  } else {
    geometry.value.getBuffer('aVertexPosition').update(new Float32Array(verts));
    geometry.value.getBuffer('aTextureCoord').update(new Float32Array(uvs));
    geometry.value.getIndex().update(new Uint16Array(indices));
  }
}

updateGeometry();

onMounted(() => {
  state.value = new PIXI.State();
  state.value.blend = true;
});

watch(texture, (newTexture) => {
  if (newTexture) {
    shader.value = new PIXI.MeshMaterial(newTexture);
  }
}, { immediate: true });

watch(() => props.layer.warp, updateGeometry, { deep: true });
watch(() => [props.layer.x, props.layer.y, props.layer.width, props.layer.height, props.layer.scale, props.layer.rotation], updateGeometry, { deep: true });

onUnmounted(() => {
    if (texture.value && texture.value.textureCacheIds) {
        texture.value.textureCacheIds.forEach(id => {
            if (id.startsWith('data:image/svg+xml')) {
                PIXI.Texture.removeFromCache(id);
                PIXI.BaseTexture.removeFromCache(id);
            }
        });
    }
    if (geometry.value) {
        geometry.value.destroy();
    }
});
</script>