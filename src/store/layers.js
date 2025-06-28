import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useProjectStore } from './project';
import { useHistoryStore } from './history';
import { commandFactory } from '../utils/commandFactory';

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
    const historyStore = useHistoryStore();
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

    // Add the layer directly first
    layers.value.unshift(newLayer);
    
    // Create command for undo/redo history
    const command = {
      type: 'ADD_LAYER',
      execute() {
        // If this is called from redo, the layer might have been removed
        const existingIndex = layers.value.findIndex(l => l.id === id);
        if (existingIndex === -1) {
          layers.value.unshift({...newLayer});
        }
      },
      undo() {
        const index = layers.value.findIndex(l => l.id === id);
        if (index !== -1) {
          layers.value.splice(index, 1);
        }
        if (selectedLayerId.value === id) {
          selectedLayerId.value = layers.value.length > 0 ? layers.value[0].id : null;
        }
      },
      timestamp: Date.now(),
      description: `Add ${type} layer`
    };
    
    // Push the command to history without executing it again
    historyStore.pushCommand(command);

    selectedLayerId.value = id;
    return newLayer;
  }

  function removeLayer(id) {
    const historyStore = useHistoryStore();
    const index = layers.value.findIndex(layer => layer.id === id);
    
    if (index !== -1) {
      // Store original layer state for undo
      const layerState = { ...layers.value[index] };
      
      // Create and execute command
      const command = commandFactory.removeLayer(id, layerState);
      command.execute();
      historyStore.pushCommand(command);
      
      if (selectedLayerId.value === id) {
        selectedLayerId.value = layers.value.length > 0 ? layers.value[0].id : null;
      }
    }
  }

  function updateLayer(id, updates) {
    const historyStore = useHistoryStore();
    const layer = layers.value.find(l => l.id === id);
    if (!layer) return;

    // Store original state for undo
    const originalState = {};
    for (const key in updates) {
      if (key in layer) {
        // Create a safe copy of the original value without using structuredClone
        if (key === 'warp' && layer[key]) {
          originalState[key] = {
            enabled: layer[key].enabled,
            points: layer[key].points ? layer[key].points.map(p => ({ x: p.x, y: p.y })) : []
          };
        } else if (key === 'scale' && layer[key]) {
          originalState[key] = { x: layer[key].x, y: layer[key].y };
        } else if (key === 'content' && layer[key]) {
          originalState[key] = { ...layer[key] };
        } else if (key === 'properties' && layer[key]) {
          originalState[key] = { ...layer[key] };
        } else {
          originalState[key] = layer[key];
        }
      }
    }

    // If position changes and warp points exist, shift them accordingly
    const delta = { x: 0, y: 0 };
    if (typeof updates.x === 'number') {
      delta.x = updates.x - layer.x;
    }
    if (typeof updates.y === 'number') {
      delta.y = updates.y - layer.y;
    }

    if ((delta.x !== 0 || delta.y !== 0) && layer.warp?.points?.length) {
      // Create a safe copy of warp points and update them
      const newPoints = layer.warp.points.map(p => ({ x: p.x + delta.x, y: p.y + delta.y }));
      updates.warp = {
        ...(layer.warp || {}),
        points: newPoints,
      };
    }

    // Create and execute command
    const command = commandFactory.updateLayer(id, updates, originalState);
    command.execute();
    historyStore.pushCommand(command);
  }

  function reorderLayers(fromIndex, toIndex) {
    const historyStore = useHistoryStore();
    
    // Create and execute command
    const command = commandFactory.reorderLayers(fromIndex, toIndex);
    command.execute();
    historyStore.pushCommand(command);
  }

  function duplicateLayer(id) {
    const historyStore = useHistoryStore();
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
      
      // Create and execute command
      const command = {
        type: 'DUPLICATE_LAYER',
        execute() {
          const index = layers.value.findIndex(l => l.id === id);
          layers.value.splice(index, 0, duplicate);
          selectedLayerId.value = duplicate.id;
        },
        undo() {
          const index = layers.value.findIndex(l => l.id === duplicate.id);
          if (index !== -1) {
            layers.value.splice(index, 1);
            if (selectedLayerId.value === duplicate.id) {
              selectedLayerId.value = id; // Select original layer
            }
          }
        },
        timestamp: Date.now(),
        description: `Duplicate layer ${id}`
      };
      
      command.execute();
      historyStore.pushCommand(command);
      
      return duplicate;
    }
  }

  function selectLayer(id) {
    selectedLayerId.value = id;
  }

  function clearSelection() {
    selectedLayerId.value = null;
  }
  
  // New method to restore a layer (for undo operations)
  function restoreLayer(layerState) {
    if (!layerState || !layerState.id) return;
    
    // Find the index where the layer was
    const existingIndex = layers.value.findIndex(l => l.id === layerState.id);
    
    if (existingIndex !== -1) {
      // Update existing layer
      layers.value[existingIndex] = layerState;
    } else {
      // Add layer back
      layers.value.unshift(layerState);
      
      // Update nextId if needed
      if (layerState.id >= nextId) {
        nextId = layerState.id + 1;
      }
    }
    
    // Select the restored layer
    selectedLayerId.value = layerState.id;
  }
  
  // Import layers from a project file
  function importLayers(layersData) {
    if (!Array.isArray(layersData)) return;
    
    // Clear existing layers
    layers.value = [];
    
    // Import layers
    layersData.forEach(layer => {
      layers.value.push(layer);
      
      // Update nextId if needed
      if (layer.id >= nextId) {
        nextId = layer.id + 1;
      }
    });
    
    // Select first layer if available
    if (layers.value.length > 0) {
      selectedLayerId.value = layers.value[0].id;
    } else {
      selectedLayerId.value = null;
    }
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
    nextId,
    
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
    restoreLayer,
    importLayers,
    
    // Helper functions
    getDefaultContent,
    getDefaultProperties
  };
});