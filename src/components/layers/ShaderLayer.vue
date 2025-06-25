<template>
  <mesh
    v-if="shader && geometry"
    :geometry="geometry"
    :shader="shader"
    :state="state"
    :blendMode="getBlendMode(layer.blendMode)"
    :alpha="layer.opacity"
    event-mode="static"
    @pointerdown="$emit('pointerdown', $event)"
  />
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import * as PIXI from 'pixi.js';

const props = defineProps({
  layer: { type: Object, required: true },
});

const emit = defineEmits(['pointerdown', 'requestEdit']);

const shader = ref(null);
const geometry = ref(null);
const state = ref(null);
const startTime = Date.now();
let animationFrameId = null;

function getBlendMode(mode) {
  const modes = {
    normal: PIXI.BLEND_MODES.NORMAL,
    add: PIXI.BLEND_MODES.ADD,
    screen: PIXI.BLEND_MODES.SCREEN,
    multiply: PIXI.BLEND_MODES.MULTIPLY,
  };
  return modes[mode] ?? PIXI.BLEND_MODES.NORMAL;
}

const defaultVertex = `
  precision mediump float;
  attribute vec2 aVertexPosition;
  attribute vec2 aTextureCoord;
  uniform mat3 projectionMatrix;
  varying vec2 vTextureCoord;

  void main(void) {
    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
    vTextureCoord = aTextureCoord;
  }
`;

function updateShader() {
  if (!props.layer.content.code) return;
  try {
    const uniforms = {
      time: 0,
      resolution: [props.layer.width || 200, props.layer.height || 200],
      ...(props.layer.content.uniforms || {}),
    };
    shader.value = PIXI.Shader.from(defaultVertex, props.layer.content.code, uniforms);
  } catch (error) {
    console.error('Shader compilation error:', error);
    shader.value = null;
  }
}

function updateGeometry() {
  const points = props.layer.warp?.points;
  
  // Use warp points if available, otherwise create default points based on layer position and size
  let vertices;
  if (points && points.length === 4) {
    vertices = points.flatMap(p => [p.x, p.y]);
  } else {
    // Create default vertices based on layer position and size
    const x = props.layer.x || 0;
    const y = props.layer.y || 0;
    const width = props.layer.width || 200;
    const height = props.layer.height || 200;
    vertices = [
      x - width/2, y - height/2,  // top-left
      x + width/2, y - height/2,  // top-right
      x + width/2, y + height/2,  // bottom-right
      x - width/2, y + height/2   // bottom-left
    ];
  }
  
  if (!geometry.value) {
     geometry.value = new PIXI.Geometry()
      .addAttribute('aVertexPosition', vertices, 2)
      .addAttribute('aTextureCoord', [0, 0, 1, 0, 1, 1, 0, 1], 2)
      .addIndex(getQuadIndices(points));
  } else {
    geometry.value.getBuffer('aVertexPosition').update(new Float32Array(vertices));
    geometry.value.getIndex().update(new Uint16Array(getQuadIndices(points)));
  }
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

function tick() {
  if (shader.value) {
    shader.value.uniforms.time = (Date.now() - startTime) / 1000;
  }
  animationFrameId = requestAnimationFrame(tick);
}

onMounted(() => {
  state.value = new PIXI.State();
  state.value.blend = true;
  
  updateGeometry();
  updateShader();
  
  if (props.layer.content.code.includes('// GLSL Fragment Shader')) {
    setTimeout(() => emit('requestEdit'), 100);
  }
  
  tick();
});

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (geometry.value) {
    geometry.value.destroy();
  }
  if (shader.value) {
    shader.value.destroy();
  }
});

watch(() => props.layer.content.code, updateShader);
watch(() => props.layer.warp?.points, updateGeometry, { deep: true });
watch(() => [props.layer.x, props.layer.y, props.layer.width, props.layer.height], updateGeometry);

</script>