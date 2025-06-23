import { onMounted, onUnmounted } from 'vue';
import { useLayersStore } from '../store/layers';
import { useProjectStore } from '../store/project';

export function useKeyboardShortcuts() {
  const layersStore = useLayersStore();
  const projectStore = useProjectStore();
  
  const shortcuts = {
    // E - Toggle warp handles
    'e': () => {
      // TODO: Implement handle toggle
      console.log('Toggle handles');
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
    'ctrl+d': () => {
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
      layersStore.updateLayer(layer.id, {
        position: {
          x: layer.position.x + (dx * amount),
          y: layer.position.y + (dy * amount)
        }
      });
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