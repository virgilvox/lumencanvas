import { onMounted, onUnmounted } from 'vue';
import { useLayersStore } from '../store/layers';
import { useProjectStore } from '../store/project';
import { useHistoryStore } from '../store/history';

export function useKeyboardShortcuts() {
  const layersStore = useLayersStore();
  const projectStore = useProjectStore();
  const historyStore = useHistoryStore();
  
  const shortcuts = {
    // Undo/Redo shortcuts
    'ctrl+z': (e) => {
      e.preventDefault();
      historyStore.undo();
    },
    
    'ctrl+y': (e) => {
      e.preventDefault();
      historyStore.redo();
    },
    
    'ctrl+shift+z': (e) => {
      e.preventDefault();
      historyStore.redo();
    },
    
    // E - Toggle warp handles
    'e': () => {
      const layer = layersStore.selectedLayer;
      if (layer && layer.warp) {
        // Directly update the property to avoid structuredClone issues
        const originalEnabled = layer.warp.enabled;
        layer.warp.enabled = !layer.warp.enabled;
        
        // Record the command for undo/redo
        historyStore.pushCommand({
          type: 'UPDATE_LAYER_WARP',
          execute() {
            if (layer && layer.warp) {
              layer.warp.enabled = !originalEnabled;
            }
          },
          undo() {
            if (layer && layer.warp) {
              layer.warp.enabled = originalEnabled;
            }
          },
          timestamp: Date.now(),
          description: `Toggle warp for layer ${layer.id}`
        });
      }
    },
    
    // P - Open projector view
    'p': () => {
      // TODO: Implement projector view
      console.log('Open projector');
    },
    
    // M - Mask via webcam
    'm': () => {
      // TODO: Implement masking
      console.log('Toggle mask');
    },
    
    // F2 - New shader layer
    'F2': () => {
      layersStore.addLayer(layersStore.LayerTypes.SHADER);
    },
    
    // Ctrl/Cmd + E - Open code editor
    'ctrl+e': () => {
      const selectedLayer = layersStore.selectedLayer;
      if (selectedLayer && (selectedLayer.type === layersStore.LayerTypes.SHADER || selectedLayer.type === layersStore.LayerTypes.HTML)) {
        // Emit event to open editor
        window.dispatchEvent(new CustomEvent('open-code-editor', { detail: selectedLayer }));
      }
    },
    
    // Ctrl/Cmd + D - Duplicate layer
    'ctrl+d': (e) => {
      e.preventDefault();
      if (layersStore.selectedLayerId) {
        layersStore.duplicateLayer(layersStore.selectedLayerId);
      }
    },
    
    // Ctrl/Cmd + S - Save project (manual trigger)
    'ctrl+s': (e) => {
      e.preventDefault();
      projectStore.saveProject();
    },
    
    // Ctrl/Cmd + O - Import project
    'ctrl+o': (e) => {
      e.preventDefault();
      projectStore.importFromZip();
    },
    
    // Ctrl/Cmd + Shift + S - Export project
    'ctrl+shift+s': (e) => {
      e.preventDefault();
      projectStore.exportAsZip();
    },
    
    // Delete - Remove selected layer
    'Delete': () => {
      if (layersStore.selectedLayerId) {
        layersStore.removeLayer(layersStore.selectedLayerId);
      }
    },
    
    // Arrow keys - Nudge selected layer
    'ArrowUp': (e) => nudgeLayer(0, -1, e.shiftKey),
    'ArrowDown': (e) => nudgeLayer(0, 1, e.shiftKey),
    'ArrowLeft': (e) => nudgeLayer(-1, 0, e.shiftKey),
    'ArrowRight': (e) => nudgeLayer(1, 0, e.shiftKey),
  };
  
  function nudgeLayer(dx, dy, large = false) {
    const layer = layersStore.selectedLayer;
    if (layer) {
      const amount = large ? 10 : 1;
      const newX = layer.x + (dx * amount);
      const newY = layer.y + (dy * amount);
      
      // Store original position for undo/redo
      const originalX = layer.x;
      const originalY = layer.y;
      
      // Directly update the layer position
      layer.x = newX;
      layer.y = newY;
      
      // Also update warp points if they exist
      if (layer.warp && layer.warp.points && layer.warp.points.length > 0) {
        const deltaX = newX - originalX;
        const deltaY = newY - originalY;
        
        // Store original warp points for undo/redo
        const originalPoints = layer.warp.points.map(p => ({ x: p.x, y: p.y }));
        
        // Update warp points
        for (let i = 0; i < layer.warp.points.length; i++) {
          layer.warp.points[i].x += deltaX;
          layer.warp.points[i].y += deltaY;
        }
        
        // Create command for undo/redo
        historyStore.pushCommand({
          type: 'NUDGE_LAYER_WITH_WARP',
          execute() {
            if (layer) {
              layer.x = newX;
              layer.y = newY;
              if (layer.warp && layer.warp.points) {
                for (let i = 0; i < Math.min(layer.warp.points.length, originalPoints.length); i++) {
                  layer.warp.points[i].x = originalPoints[i].x + deltaX;
                  layer.warp.points[i].y = originalPoints[i].y + deltaY;
                }
              }
            }
          },
          undo() {
            if (layer) {
              layer.x = originalX;
              layer.y = originalY;
              if (layer.warp && layer.warp.points) {
                for (let i = 0; i < Math.min(layer.warp.points.length, originalPoints.length); i++) {
                  layer.warp.points[i].x = originalPoints[i].x;
                  layer.warp.points[i].y = originalPoints[i].y;
                }
              }
            }
          },
          timestamp: Date.now(),
          description: `Nudge layer ${layer.id}`
        });
      } else {
        // Create command for undo/redo (simple position only)
        historyStore.pushCommand({
          type: 'NUDGE_LAYER',
          execute() {
            if (layer) {
              layer.x = newX;
              layer.y = newY;
            }
          },
          undo() {
            if (layer) {
              layer.x = originalX;
              layer.y = originalY;
            }
          },
          timestamp: Date.now(),
          description: `Nudge layer ${layer.id}`
        });
      }
    }
  }
  
  function handleKeyDown(e) {
    // Don't handle shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    let key = e.key;
    
    // Handle special keys
    if (e.ctrlKey || e.metaKey) {
      if (e.shiftKey) {
        key = `ctrl+shift+${key.toLowerCase()}`;
      } else {
        key = `ctrl+${key.toLowerCase()}`;
      }
    }
    
    const handler = shortcuts[key];
    if (handler) {
      e.preventDefault();
      handler(e);
    }
  }
  
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });
  
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
  
  return {
    // Expose any methods if needed
  };
}