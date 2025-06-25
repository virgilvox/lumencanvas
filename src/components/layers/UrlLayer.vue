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
  <!-- Note: Actual URL/iframe rendering on a warped surface is a complex feature for later. This placeholder ensures consistent interaction. -->
</template>

<script setup>
import * as PIXI from 'pixi.js';
import { ref, watch, onMounted } from 'vue';

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

function buildTexture() {
  // Implementation of buildTexture function
}

function buildVertices() {
  if (props.layer.warp?.points?.length === 4) {
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
  const verts = buildVertices()
  const uvs   = [0,0, 1,0, 1,1, 0,1]
  const indices = getQuadIndices(props.layer.warp?.points);

  if (!geometry.value) {
    geometry.value = new PIXI.Geometry()
      .addAttribute('aVertexPosition', verts, 2)
      .addAttribute('aTextureCoord',  uvs,   2)
      .addIndex(indices)
  } else {
    geometry.value.getBuffer('aVertexPosition').update(new Float32Array(verts))
    geometry.value.getBuffer('aTextureCoord') .update(new Float32Array(uvs))
    geometry.value.getIndex().update(new Uint16Array(indices));
  }
}

updateGeometry();

onMounted(() => {
  state.value = new PIXI.State();
  state.value.blend = true;
  shader.value = new PIXI.MeshMaterial(texture.value);
});

watch(() => props.layer.warp?.points, updateGeometry, { deep: true });
watch(() => [props.layer.x, props.layer.y, props.layer.width, props.layer.height], updateGeometry);
</script>