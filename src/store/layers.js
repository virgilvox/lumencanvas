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

    // --- Start of new transformation logic ---
    const newUpdates = { ...updates };

    const currentRotation = layer.rotation || 0;
    const currentScale = layer.scale || { x: 1, y: 1 };

    let points = layer.warp?.points;
    let hasWarp = points && points.length === 4;

    // If scale or rotation is changing, and we have warp points, we need to transform them.
    if (hasWarp && (updates.scale || typeof updates.rotation === 'number')) {
      const newRotation = (typeof updates.rotation === 'number') ? updates.rotation : currentRotation;
      const newScale = updates.scale || currentScale;

      // Calculate the center of the warp points
      const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
      const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;

      // Calculate scale and rotation deltas
      const scaleDeltaX = newScale.x / currentScale.x;
      const scaleDeltaY = newScale.y / currentScale.y;
      const rotationDelta = newRotation - currentRotation;
      
      const rotationDeltaRad = rotationDelta * (Math.PI / 180);
      const cos = Math.cos(rotationDeltaRad);
      const sin = Math.sin(rotationDeltaRad);

      const transformedPoints = points.map(p => {
        // Translate to origin for transformation
        let x = p.x - centerX;
        let y = p.y - centerY;
        
        // Apply scale first
        x *= scaleDeltaX;
        y *= scaleDeltaY;

        // Then apply rotation
        const rotatedX = x * cos - y * sin;
        const rotatedY = x * sin + y * cos;

        // Translate back to original position
        return {
          x: rotatedX + centerX,
          y: rotatedY + centerY,
        };
      });
      // We only update the warp points, the canonical scale/rotation is handled by the command
      newUpdates.warp = { ...layer.warp, points: transformedPoints };
    }
    
    // If position changes, we must also shift the warp points
    const delta = { x: 0, y: 0 };
    if (typeof updates.x === 'number' && updates.x !== layer.x) {
      delta.x = updates.x - layer.x;
    }
    if (typeof updates.y === 'number' && updates.y !== layer.y) {
      delta.y = updates.y - layer.y;
    }
    if ((delta.x !== 0 || delta.y !== 0) && hasWarp) {
        const newPoints = points.map(p => ({ x: p.x + delta.x, y: p.y + delta.y }));
        // If warp points are already being updated by scale/rotation, merge the changes
        newUpdates.warp = { ...(newUpdates.warp || layer.warp), points: newPoints };
    }
    // --- End of new transformation logic ---

    const command = commandFactory.updateLayer(id, newUpdates);
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
    // Ensure layersData is an array
    if (!Array.isArray(layersData)) {
      console.warn('importLayers received invalid data:', layersData);
      layers.value = [];
      selectedLayerId.value = null;
      return;
    }
    
    try {
      // Reset nextId to ensure we don't reuse IDs
      nextId = 1;
      
      // Clear existing layers
      layers.value = [];
      
      // Import layers with validation
      layersData.forEach(layer => {
        // Skip invalid layers
        if (!layer || typeof layer !== 'object') {
          console.warn('Skipping invalid layer:', layer);
          return;
        }
        
        try {
          // Ensure layer has required properties
          const validLayer = {
            id: typeof layer.id === 'number' ? layer.id : nextId++,
            type: layer.type && typeof layer.type === 'string' ? layer.type : LayerTypes.HTML,
            name: layer.name && typeof layer.name === 'string' ? layer.name : `Layer ${nextId}`,
            visible: typeof layer.visible === 'boolean' ? layer.visible : true,
            opacity: typeof layer.opacity === 'number' && layer.opacity >= 0 && layer.opacity <= 1 ? 
              layer.opacity : 1,
            blendMode: layer.blendMode && typeof layer.blendMode === 'string' ? 
              layer.blendMode : BlendModes.NORMAL,
            x: typeof layer.x === 'number' ? layer.x : 0,
            y: typeof layer.y === 'number' ? layer.y : 0,
            width: typeof layer.width === 'number' && layer.width > 0 ? layer.width : 200,
            height: typeof layer.height === 'number' && layer.height > 0 ? layer.height : 200,
            scale: layer.scale && typeof layer.scale === 'object' ? 
              { 
                x: typeof layer.scale.x === 'number' ? layer.scale.x : 1, 
                y: typeof layer.scale.y === 'number' ? layer.scale.y : 1 
              } : 
              { x: 1, y: 1 },
            rotation: typeof layer.rotation === 'number' ? layer.rotation : 0,
            content: layer.content && typeof layer.content === 'object' ? 
              layer.content : getDefaultContent(layer.type || LayerTypes.HTML),
            properties: layer.properties && typeof layer.properties === 'object' ? 
              layer.properties : getDefaultProperties(layer.type || LayerTypes.HTML),
          };
          
          // Handle warp points with extra validation
          if (layer.warp && typeof layer.warp === 'object' && Array.isArray(layer.warp.points)) {
            validLayer.warp = {
              enabled: typeof layer.warp.enabled === 'boolean' ? layer.warp.enabled : false,
              points: layer.warp.points
                .filter(p => p && typeof p === 'object' && typeof p.x === 'number' && typeof p.y === 'number')
                .map(p => ({ x: p.x, y: p.y }))
            };
          } else {
            // Default warp configuration
            validLayer.warp = {
              enabled: false,
              points: [
                { x: validLayer.x - validLayer.width / 2, y: validLayer.y - validLayer.height / 2 },
                { x: validLayer.x + validLayer.width / 2, y: validLayer.y - validLayer.height / 2 },
                { x: validLayer.x + validLayer.width / 2, y: validLayer.y + validLayer.height / 2 },
                { x: validLayer.x - validLayer.width / 2, y: validLayer.y + validLayer.height / 2 },
              ]
            };
          }
          
          // Add the validated layer
          layers.value.push(validLayer);
          
          // Update nextId if needed
          if (validLayer.id >= nextId) {
            nextId = validLayer.id + 1;
          }
        } catch (layerError) {
          console.error('Error processing layer:', layerError);
          // Continue with next layer
        }
      });
      
      // Select first layer if available
      if (layers.value.length > 0) {
        selectedLayerId.value = layers.value[0].id;
      } else {
        selectedLayerId.value = null;
      }
    } catch (error) {
      console.error('Error importing layers:', error);
      // Reset to empty state on critical error
      layers.value = [];
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