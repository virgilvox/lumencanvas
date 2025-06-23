import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useLayersStore = defineStore('layers', () => {
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
    const newLayer = {
      id,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${id}`,
      visible: true,
      opacity: 1,
      blendMode: BlendModes.NORMAL,
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      content: content || getDefaultContent(type),
      properties: getDefaultProperties(type),
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
    if (layer) {
      Object.assign(layer, updates);
    }
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
          code: `// GLSL Shader
precision mediump float;
uniform float time;
uniform vec2 resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 color = vec3(uv.x, uv.y, abs(sin(time)));
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