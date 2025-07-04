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
    // Create uniforms with proper types
    const width = props.layer.width || 200;
    const height = props.layer.height || 200;
    
    const uniforms = {
      time: 0.0,
      resolution: [width, height],
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

    const transformedCorners = corners.map(p => {
        const rotatedX = p.x * cos - p.y * sin;
        const rotatedY = p.x * sin + p.y * cos;
        return { x: rotatedX + x, y: rotatedY + y };
    });

    vertices = transformedCorners.flatMap(p => [p.x, p.y]);
  }
  
  // Create or update geometry
  if (!geometry.value) {
    geometry.value = new PIXI.Geometry()
      .addAttribute('aVertexPosition', vertices, 2)
      .addAttribute('aTextureCoord', [0, 0, 1, 0, 1, 1, 0, 1], 2)
      .addIndex([0, 1, 2, 0, 2, 3]); // Use consistent indices
  } else {
    geometry.value.getBuffer('aVertexPosition').update(new Float32Array(vertices));
  }
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
  
  // Only request edit if it's a new shader with the default template
  if (props.layer.content.code && props.layer.content.code.includes('// GLSL Fragment Shader')) {
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
watch(() => props.layer.warp, updateGeometry, { deep: true });
watch(() => [props.layer.x, props.layer.y, props.layer.width, props.layer.height, props.layer.scale, props.layer.rotation], updateGeometry, { deep: true });
</script>