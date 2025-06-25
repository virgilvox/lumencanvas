import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useProjectStore } from './project';

export const useLayersStore = defineStore('layers', () => {
  const projectStore = useProjectStore();
  // State
  const layers = ref([]);
  const selectedLayerId = ref(null);
  let nextId = 1;

  // Layer types enum
  const LayerTypes = {
    IMAGE: 'image',
    VIDEO: 'video',
    URL: 'url',
    HTML: 'html',
    SHADER: 'shader',
  };

  // Blend modes
  const BlendModes = {
    NORMAL: 'normal',
    ADD: 'add',
    SCREEN: 'screen',
    MULTIPLY: 'multiply',
  };

  // Getters
  const selectedLayer = computed(() => 
    layers.value.find(layer => layer.id === selectedLayerId.value)
  );

  const visibleLayers = computed(() => 
    layers.value.filter(layer => layer.visible).reverse() // Bottom to top for rendering
  );

  // Actions
  function addLayer(type, content = null) {
    const id = nextId++;
    const x = projectStore.canvasWidth / 2;
    const y = projectStore.canvasHeight / 2;
    const width = 200;
    const height = 200;
    
    const newLayer = {
      id,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${id}`,
      visible: true,
      opacity: 1,
      blendMode: BlendModes.NORMAL,
      x,
      y,
      width,
      height,
      scale: { x: 1, y: 1 },
      rotation: 0,
      content: content || getDefaultContent(type),
      properties: getDefaultProperties(type),
      warp: {
        enabled: false,
        points: [
          { x: x - width / 2, y: y - height / 2 },
          { x: x + width / 2, y: y - height / 2 },
          { x: x + width / 2, y: y + height / 2 },
          { x: x - width / 2, y: y + height / 2 },
        ]
      }
    };

    layers.value.unshift(newLayer); // Add to top
    selectedLayerId.value = id;
    return newLayer;
  }

  function removeLayer(id) {
    const index = layers.value.findIndex(layer => layer.id === id);
    if (index !== -1) {
      layers.value.splice(index, 1);
      if (selectedLayerId.value === id) {
        selectedLayerId.value = layers.value.length > 0 ? layers.value[0].id : null;
      }
    }
  }

  function updateLayer(id, updates) {
    const layer = layers.value.find(l => l.id === id);
    if (!layer) return;

    // If position changes and warp points exist, shift them accordingly
    const delta = { x: 0, y: 0 };
    if (typeof updates.x === 'number') {
      delta.x = updates.x - layer.x;
    }
    if (typeof updates.y === 'number') {
      delta.y = updates.y - layer.y;
    }

    if ((delta.x !== 0 || delta.y !== 0) && layer.warp?.points?.length) {
      const newPoints = layer.warp.points.map(p => ({ x: p.x + delta.x, y: p.y + delta.y }));
      updates.warp = {
        ...(layer.warp || {}),
        points: newPoints,
      };
    }

    Object.assign(layer, updates);
  }

  function reorderLayers(fromIndex, toIndex) {
    const [removed] = layers.value.splice(fromIndex, 1);
    layers.value.splice(toIndex, 0, removed);
  }

  function duplicateLayer(id) {
    const layer = layers.value.find(l => l.id === id);
    if (layer) {
      const duplicate = {
        ...layer,
        id: nextId++,
        name: `${layer.name} Copy`,
        // Deep clone nested objects
        scale: { ...layer.scale },
        content: { ...layer.content },
        properties: { ...layer.properties },
        warp: layer.warp ? {
          ...layer.warp,
          points: layer.warp.points ? [...layer.warp.points] : []
        } : null
      };
      const index = layers.value.findIndex(l => l.id === id);
      layers.value.splice(index, 0, duplicate);
      selectedLayerId.value = duplicate.id;
      return duplicate;
    }
  }

  function selectLayer(id) {
    selectedLayerId.value = id;
  }

  function clearSelection() {
    selectedLayerId.value = null;
  }

  // Helper functions
  function getDefaultContent(type) {
    switch(type) {
      case LayerTypes.IMAGE:
        return { src: null };
      case LayerTypes.VIDEO:
        return { src: null, playing: true, loop: true };
      case LayerTypes.URL:
        return { url: 'https://example.com' };
      case LayerTypes.HTML:
        return { html: '<div style="color: white;">Hello World</div>' };
      case LayerTypes.SHADER:
        return { 
          code: `// GLSL Fragment Shader
precision mediump float;

uniform float time;
uniform vec2 resolution;

void main() {
  // Normalized coordinates (0 to 1)
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  
  // Center the coordinates (-0.5 to 0.5)
  uv = uv - 0.5;
  
  // Create animated gradient
  float wave = sin(uv.x * 10.0 + time * 2.0) * 0.5 + 0.5;
  float wave2 = sin(uv.y * 10.0 - time * 1.5) * 0.5 + 0.5;
  
  // Mix colors
  vec3 color1 = vec3(0.071, 0.690, 1.0); // Cyan
  vec3 color2 = vec3(1.0, 0.271, 0.416); // Pink
  vec3 color = mix(color1, color2, wave * wave2);
  
  // Add glow effect
  float dist = length(uv);
  float glow = 1.0 - smoothstep(0.0, 0.5, dist);
  color += glow * 0.2;
  
  gl_FragColor = vec4(color, 1.0);
}`,
          uniforms: {}
        };
      default:
        return {};
    }
  }

  function getDefaultProperties(type) {
    // Type-specific properties
    switch(type) {
      case LayerTypes.VIDEO:
        return { volume: 1, playbackRate: 1 };
      case LayerTypes.URL:
        return { scrollable: false, interactive: false };
      default:
        return {};
    }
  }

  return {
    // State
    layers,
    selectedLayerId,
    
    // Getters
    selectedLayer,
    visibleLayers,
    
    // Constants
    LayerTypes,
    BlendModes,
    
    // Actions
    addLayer,
    removeLayer,
    updateLayer,
    reorderLayers,
    duplicateLayer,
    selectLayer,
    clearSelection,
  };
});