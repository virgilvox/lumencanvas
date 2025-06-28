import { useLayersStore } from '../store/layers';
import { useProjectStore } from '../store/project';

/**
 * Command factory for creating undo/redo commands
 */
export const commandFactory = {
  /**
   * Create a command for updating a layer
   * @param {Number} layerId - ID of the layer to update
   * @param {Object} updates - Properties to update
   * @param {Object} originalState - Original state before update
   * @returns {Object} Command object with execute and undo methods
   */
  updateLayer(layerId, updates, originalState) {
    const layersStore = useLayersStore();
    
    return {
      type: 'UPDATE_LAYER',
      execute() {
        const layer = layersStore.layers.find(l => l.id === layerId);
        if (!layer) return;
        
        // Apply updates directly to the layer
        for (const key in updates) {
          if (key === 'warp' && updates[key]) {
            layer.warp = {
              enabled: updates[key].enabled !== undefined ? updates[key].enabled : layer.warp?.enabled,
              points: updates[key].points ? [...updates[key].points] : layer.warp?.points
            };
          } else if (key === 'scale' && updates[key]) {
            layer.scale = { x: updates[key].x, y: updates[key].y };
          } else if (key === 'content' && updates[key]) {
            layer.content = { ...layer.content, ...updates[key] };
          } else if (key === 'properties' && updates[key]) {
            layer.properties = { ...layer.properties, ...updates[key] };
          } else {
            layer[key] = updates[key];
          }
        }
      },
      undo() {
        const layer = layersStore.layers.find(l => l.id === layerId);
        if (!layer) return;
        
        // Restore original state
        for (const key in originalState) {
          if (key === 'warp' && originalState[key]) {
            layer.warp = {
              enabled: originalState[key].enabled,
              points: originalState[key].points ? [...originalState[key].points] : []
            };
          } else if (key === 'scale' && originalState[key]) {
            layer.scale = { x: originalState[key].x, y: originalState[key].y };
          } else if (key === 'content' && originalState[key]) {
            layer.content = { ...originalState[key] };
          } else if (key === 'properties' && originalState[key]) {
            layer.properties = { ...originalState[key] };
          } else {
            layer[key] = originalState[key];
          }
        }
      },
      timestamp: Date.now(),
      description: `Update layer ${layerId}`
    };
  },
  
  /**
   * Create a command for adding a layer
   * @param {Object} layerData - Layer data to add
   * @returns {Object} Command object with execute and undo methods
   */
  addLayer(layerData) {
    const layersStore = useLayersStore();
    const projectStore = useProjectStore();
    let addedLayer = null;
    let addedLayerId = null;
    
    return {
      type: 'ADD_LAYER',
      execute() {
        // Create a new layer with the specified type and content
        const id = layersStore.nextId++;
        const x = projectStore.canvasWidth / 2;
        const y = projectStore.canvasHeight / 2;
        const width = 200;
        const height = 200;
        
        addedLayer = {
          id,
          type: layerData.type,
          name: `${layerData.type.charAt(0).toUpperCase() + layerData.type.slice(1)} ${id}`,
          visible: true,
          opacity: 1,
          blendMode: layersStore.BlendModes.NORMAL,
          x,
          y,
          width,
          height,
          scale: { x: 1, y: 1 },
          rotation: 0,
          content: layerData.content || layersStore.getDefaultContent(layerData.type),
          properties: layersStore.getDefaultProperties(layerData.type),
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
        
        addedLayerId = id;
        layersStore.layers.unshift(addedLayer);
        layersStore.selectedLayerId = id;
        
        return addedLayer;
      },
      undo() {
        if (addedLayerId !== null) {
          const index = layersStore.layers.findIndex(l => l.id === addedLayerId);
          if (index !== -1) {
            layersStore.layers.splice(index, 1);
          }
          if (layersStore.selectedLayerId === addedLayerId) {
            layersStore.selectedLayerId = layersStore.layers.length > 0 ? layersStore.layers[0].id : null;
          }
        }
      },
      timestamp: Date.now(),
      description: `Add ${layerData.type} layer`
    };
  },
  
  /**
   * Create a command for removing a layer
   * @param {Number} layerId - ID of the layer to remove
   * @param {Object} layerState - Full state of the layer before removal
   * @returns {Object} Command object with execute and undo methods
   */
  removeLayer(layerId, layerState) {
    const layersStore = useLayersStore();
    
    return {
      type: 'REMOVE_LAYER',
      execute() {
        layersStore.removeLayer(layerId);
      },
      undo() {
        // We need to restore the layer with its original ID and state
        layersStore.restoreLayer(layerState);
      },
      timestamp: Date.now(),
      description: `Remove layer ${layerId}`
    };
  },
  
  /**
   * Create a command for reordering layers
   * @param {Number} fromIndex - Original index
   * @param {Number} toIndex - Target index
   * @returns {Object} Command object with execute and undo methods
   */
  reorderLayers(fromIndex, toIndex) {
    const layersStore = useLayersStore();
    
    return {
      type: 'REORDER_LAYERS',
      execute() {
        layersStore.reorderLayers(fromIndex, toIndex);
      },
      undo() {
        // To undo, we swap the indices
        layersStore.reorderLayers(toIndex, fromIndex);
      },
      timestamp: Date.now(),
      description: `Reorder layers`
    };
  },
  
  /**
   * Create a command for updating warp points
   * @param {Number} layerId - ID of the layer
   * @param {Number} pointIndex - Index of the warp point
   * @param {Object} newPosition - New position {x, y}
   * @param {Object} oldPosition - Old position {x, y}
   * @returns {Object} Command object with execute and undo methods
   */
  updateWarpPoint(layerId, pointIndex, newPosition, oldPosition) {
    const layersStore = useLayersStore();
    
    return {
      type: 'UPDATE_WARP_POINT',
      execute() {
        const layer = layersStore.layers.find(l => l.id === layerId);
        if (layer?.warp?.points) {
          // Directly update the point instead of using updateLayer
          layer.warp.points[pointIndex] = { x: newPosition.x, y: newPosition.y };
        }
      },
      undo() {
        const layer = layersStore.layers.find(l => l.id === layerId);
        if (layer?.warp?.points) {
          // Directly update the point instead of using updateLayer
          layer.warp.points[pointIndex] = { x: oldPosition.x, y: oldPosition.y };
        }
      },
      timestamp: Date.now(),
      description: `Update warp point ${pointIndex} of layer ${layerId}`
    };
  },
  
  /**
   * Create a command for updating canvas properties
   * @param {Object} updates - Properties to update
   * @param {Object} originalState - Original state before update
   * @returns {Object} Command object with execute and undo methods
   */
  updateCanvas(updates, originalState) {
    const projectStore = useProjectStore();
    
    return {
      type: 'UPDATE_CANVAS',
      execute() {
        for (const [key, value] of Object.entries(updates)) {
          if (key in projectStore) {
            projectStore[key] = value;
          }
        }
      },
      undo() {
        for (const [key, value] of Object.entries(originalState)) {
          if (key in projectStore) {
            projectStore[key] = value;
          }
        }
      },
      timestamp: Date.now(),
      description: `Update canvas properties`
    };
  }
}; 