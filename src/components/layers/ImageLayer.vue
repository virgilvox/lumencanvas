<template>
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
import { ref, watchEffect, computed, watch, onMounted } from 'vue';
import * as PIXI from 'pixi.js';

const props = defineProps({
  layer: { type: Object, required: true },
});

const emit = defineEmits(['pointerdown']);

const texture = ref(PIXI.Texture.WHITE);
const state = ref(null);
const shader = ref(null);

// Pixi v8 requires an explicit Geometry object for meshes. This avoids
// `buffers undefined` crashes that occurred when passing raw vertex data.
const geometry = ref(null);

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
  // Heuristic to flip the triangulation for concave quads.
  // This checks if the diagonal from point 1 to 3 is shorter
  // than the diagonal from 0 to 2. If so, it uses an alternative
  // triangulation to prevent the mesh from "cutting across" itself.
  const p = points;
  const d02_sq = Math.pow(p[2].x - p[0].x, 2) + Math.pow(p[2].y - p[0].y, 2);
  const d13_sq = Math.pow(p[3].x - p[1].x, 2) + Math.pow(p[3].y - p[1].y, 2);
  return d13_sq < d02_sq 
    ? [0, 1, 3, 1, 2, 3] 
    : [0, 1, 2, 0, 2, 3];
}

function updateGeometry () {
  const verts = buildVertices()             // length = 8 numbers
  const uvs   = [0,0, 1,0, 1,1, 0,1]        // << 8 numbers too
  const indices = getQuadIndices(props.layer.warp?.points || []);

  if (!geometry.value) {
    geometry.value = new PIXI.Geometry()
      .addAttribute('aVertexPosition', verts, 2)
      .addAttribute('aTextureCoord',  uvs,   2)   // keep in sync
      .addIndex(indices)
  } else {
    geometry.value.getBuffer('aVertexPosition').update(new Float32Array(verts))
    geometry.value.getBuffer('aTextureCoord') .update(new Float32Array(uvs))   // NEW
    geometry.value.getIndex().update(new Uint16Array(indices));
  }
}

updateGeometry();

onMounted(() => {
  state.value = new PIXI.State();
  state.value.blend = true;
});

// Update shader when texture changes
watch(texture, (newTexture) => {
  if (newTexture) {
    shader.value = new PIXI.MeshMaterial(newTexture);
  }
}, { immediate: true });

// Reactively update geometry when warp points or basic transform change
watch(() => props.layer.warp?.points, updateGeometry, { deep: true });
watch(() => [props.layer.x, props.layer.y, props.layer.width, props.layer.height], updateGeometry);

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
  if (props.layer.content?.src) {
    try {
      texture.value = await PIXI.Assets.load({
        src: props.layer.content.src,
        data: {
          crossorigin: 'anonymous',
        }
      });
    } catch (e) {
      console.error(`Failed to load texture for layer ${props.layer.id}:`, e);
      texture.value = PIXI.Texture.WHITE;
    }
  } else {
    texture.value = PIXI.Texture.WHITE;
  }
});
</script>