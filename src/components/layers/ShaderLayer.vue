<template>
  <Mesh
    v-if="shader"
    :geometry="geometry"
    :shader="shader"
    :x="layer.position.x"
    :y="layer.position.y"
    :scale="layer.scale"
    :rotation="layer.rotation"
    :alpha="layer.opacity"
    :blend-mode="getBlendMode(layer.blendMode)"
  />
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { Mesh } from 'vue3-pixi';
import * as PIXI from 'pixi.js';

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

const emit = defineEmits(['requestEdit']);

const shader = ref(null);
const geometry = ref(null);
const startTime = Date.now();

function getBlendMode(mode) {
  const modes = {
    normal: 'normal',
    add: 'add',
    screen: 'screen',
    multiply: 'multiply'
  };
  return modes[mode] || 'normal';
}

// Default vertex shader
const defaultVertex = `
  attribute vec2 aVertexPosition;
  attribute vec2 aTextureCoord;

  uniform mat3 projectionMatrix;
  uniform mat3 translationMatrix;

  varying vec2 vTextureCoord;

  void main(void) {
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
    vTextureCoord = aTextureCoord;
  }
`;

function createShader() {
  if (!props.layer.content.code) return;
  
  try {
    // Create geometry for the shader quad
    const width = props.canvasSize.width;
    const height = props.canvasSize.height;
    geometry.value = new PIXI.Geometry()
      .addAttribute('aVertexPosition', 
        [-width/2, -height/2, width/2, -height/2, width/2, height/2, -width/2, height/2], 2)
      .addAttribute('aTextureCoord', 
        [0, 0, 1, 0, 1, 1, 0, 1], 2)
      .addIndex([0, 1, 2, 0, 2, 3]);
    
    // Build uniforms
    const uniforms = {
      time: 0,
      resolution: [width, height],
      ...props.layer.content.uniforms
    };
    
    // Create shader program
    shader.value = PIXI.Shader.from(
      defaultVertex,
      props.layer.content.code,
      uniforms
    );
  } catch (error) {
    console.error('Shader compilation error:', error);
  }
}

// Update shader uniforms on tick
function updateUniforms() {
  if (shader.value) {
    shader.value.uniforms.time = (Date.now() - startTime) / 1000;
    shader.value.uniforms.resolution = [props.canvasSize.width, props.canvasSize.height];
  }
  requestAnimationFrame(updateUniforms);
}

// Auto-open editor for new shader layers
onMounted(() => {
  createShader();
  updateUniforms();
  
  // If this is a new shader with default code, request edit
  if (props.layer.content.code.includes('gl_FragColor = vec4(color, 1.0);')) {
    setTimeout(() => {
      emit('requestEdit');
    }, 100);
  }
});

// Recreate shader when code changes
watch(() => props.layer.content.code, () => {
  createShader();
});

// Update canvas size
watch(() => props.canvasSize, () => {
  if (shader.value) {
    shader.value.uniforms.resolution = [props.canvasSize.width, props.canvasSize.height];
  }
  createShader();
}, { deep: true });
</script>