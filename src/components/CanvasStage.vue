<template>
  <div 
    class="canvas-container" 
    ref="containerRef"
  >
    <Application
      ref="appRef"
      :width="projectStore.canvasWidth"
      :height="projectStore.canvasHeight"
      :background="0x000000"
      :antialias="true"
      @init="onInit"
    >
      <container>
        <!-- Render each layer using LayerRenderer -->
        <LayerRenderer
          v-for="layer in layers"
          :key="layer.id"
          :layer="layer"
          :canvas-size="{ width: projectStore.canvasWidth, height: projectStore.canvasHeight }"
          @pointerdown="onLayerPointerDown($event, layer)"
          @request-edit="$emit('requestEdit', layer)"
        />

        <!-- Selection outline and warp handles -->
        <container v-if="selectedLayer && selectedLayer.warp?.enabled">
          <graphics @render="drawSelectionOutline" />
          <container v-if="selectedLayer.warp?.enabled">
            <WarpHandle
              v-for="(point, index) in selectedLayer.warp.points"
              :key="`handle-${index}`"
              :id="`${selectedLayer.id}-${index}`"
              :x="point.x"
              :y="point.y"
              @update:position="pos => updateWarpPoint(index, pos)"
            />
          </container>
        </container>
      </container>
    </Application>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { Application } from 'vue3-pixi';
import { useLayersStore } from '../store/layers';
import { useProjectStore } from '../store/project';
import { useHistoryStore } from '../store/history';
import { commandFactory } from '../utils/commandFactory';
import LayerRenderer from './layers/LayerRenderer.vue';
import WarpHandle from './WarpHandle.vue';

const layersStore = useLayersStore();
const projectStore = useProjectStore();
const historyStore = useHistoryStore();
const { layers, selectedLayer } = storeToRefs(layersStore);

const appRef = ref(null);
const containerRef = ref(null);

// This initialization function just initializes the app
const onInit = (app) => {
  appRef.value = app;
};

// Convert screen coordinates to canvas coordinates
function getCanvasPosition(clientX, clientY) {
  const canvasRect = containerRef.value?.getBoundingClientRect();
  if (!canvasRect) return null;
  
  return {
    x: clientX - canvasRect.left,
    y: clientY - canvasRect.top
  };
}

// Handle layer pointer down event
const onLayerPointerDown = (event, layer) => {
  try {
    // Select the layer
    layersStore.selectLayer(layer.id);
    
    // Get the event target
    const target = event.currentTarget || event.target;
    if (!target) return;
    
    // Get pointer position
    let pointerX, pointerY;
    
    if (event.data && event.data.global) {
      pointerX = event.data.global.x;
      pointerY = event.data.global.y;
    } else if (event.global) {
      pointerX = event.global.x;
      pointerY = event.global.y;
    } else if (event.clientX !== undefined) {
      const pos = getCanvasPosition(event.clientX, event.clientY);
      if (pos) {
        pointerX = pos.x;
        pointerY = pos.y;
      }
    }
    
    if (pointerX === undefined || pointerY === undefined) {
      console.error('Could not determine pointer position');
      return;
    }
    
    // Calculate offset between pointer and layer position
    const offsetX = pointerX - layer.x;
    const offsetY = pointerY - layer.y;
    
    // Store layer and offset in event target's dataset
    target._dragData = {
      layerId: layer.id,
      offsetX,
      offsetY,
      startX: layer.x,
      startY: layer.y,
      // Store a deep copy of the initial warp points
      startWarpPoints: layer.warp && layer.warp.points ? 
        layer.warp.points.map(p => ({ x: p.x, y: p.y })) : 
        []
    };
    
    // Set up pointer move and pointer up handlers
    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
    target.addEventListener('pointercancel', onPointerUp);
    
    // Use pointer capture to ensure we get all events
    if (typeof target.setPointerCapture === 'function' && event.pointerId !== undefined) {
      target.setPointerCapture(event.pointerId);
    }
    
    // Prevent default to avoid text selection, etc.
    if (event.preventDefault) event.preventDefault();
  } catch (err) {
    console.error('Error in onLayerPointerDown:', err);
  }
};

// Handle pointer move event
function onPointerMove(event) {
  try {
    const target = event.currentTarget;
    if (!target || !target._dragData) return;
    
    const { layerId, offsetX, offsetY } = target._dragData;
    const layer = layersStore.layers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Get pointer position
    let pointerX, pointerY;
    
    if (event.data && event.data.global) {
      pointerX = event.data.global.x;
      pointerY = event.data.global.y;
    } else if (event.global) {
      pointerX = event.global.x;
      pointerY = event.global.y;
    } else if (event.clientX !== undefined) {
      const pos = getCanvasPosition(event.clientX, event.clientY);
      if (pos) {
        pointerX = pos.x;
        pointerY = pos.y;
      }
    }
    
    if (pointerX === undefined || pointerY === undefined) return;
    
    // Calculate new layer position
    const newX = pointerX - offsetX;
    const newY = pointerY - offsetY;
    
    // Calculate delta for warp points
    const dx = newX - layer.x;
    const dy = newY - layer.y;
    
    // Create simpler update object
    const updatedLayerData = { x: newX, y: newY };
    
    // Also update warp points if they exist
    if (layer.warp && layer.warp.points && layer.warp.points.length > 0) {
      const newPoints = layer.warp.points.map(p => ({ 
        x: p.x + dx, 
        y: p.y + dy 
      }));
      
      updatedLayerData.warp = {
        enabled: layer.warp.enabled,
        points: newPoints
      };
    }
    
    // Update the layer position directly (will be recorded on pointer up)
    // Directly modify the layer instead of using updateLayer to avoid structuredClone
    const layerToUpdate = layersStore.layers.find(l => l.id === layerId);
    if (layerToUpdate) {
      layerToUpdate.x = newX;
      layerToUpdate.y = newY;
      
      if (layerToUpdate.warp && layerToUpdate.warp.points && updatedLayerData.warp) {
        layerToUpdate.warp.points = updatedLayerData.warp.points;
      }
    }
  } catch (err) {
    console.error('Error in onPointerMove:', err);
  }
}

// Handle pointer up event
function onPointerUp(event) {
  try {
    const target = event.currentTarget;
    if (!target || !target._dragData) return;
    
    const { layerId, startX, startY } = target._dragData;
    const layer = layersStore.layers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Only record the command if the position actually changed
    if (layer.x !== startX || layer.y !== startY) {
      // Create original state object
      const originalState = { 
        x: startX, 
        y: startY 
      };
      
      // Add warp points to original state if they exist
      if (layer.warp && layer.warp.enabled && target._dragData.startWarpPoints) {
        originalState.warp = {
          enabled: layer.warp.enabled,
          points: target._dragData.startWarpPoints.map(p => ({ x: p.x, y: p.y }))
        };
      }
      
      // Create final state object
      const finalState = { 
        x: layer.x, 
        y: layer.y 
      };
      
      // Add warp points to final state if they exist
      if (layer.warp && layer.warp.enabled && layer.warp.points) {
        finalState.warp = {
          enabled: layer.warp.enabled,
          points: layer.warp.points.map(p => ({ x: p.x, y: p.y }))
        };
      }
      
      // Record the command for undo/redo
      const command = commandFactory.updateLayer(layerId, finalState, originalState);
      historyStore.pushCommand(command);
    }
    
    // Clean up
    target._dragData = null;
    
    // Release pointer capture
    if (typeof target.releasePointerCapture === 'function' && event.pointerId !== undefined) {
      target.releasePointerCapture(event.pointerId);
    }
    
    // Remove event listeners
    if (typeof target.removeEventListener === 'function') {
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerUp);
    }
  } catch (err) {
    console.error('Error in onPointerUp:', err);
  }
}

// Track warp point original positions for undo/redo
const warpPointOriginalPositions = ref({});

const updateWarpPoint = (index, position) => {
  if (selectedLayer.value?.warp?.enabled) {
    // Store original position if this is the first move
    if (!warpPointOriginalPositions.value[index]) {
      warpPointOriginalPositions.value[index] = { 
        x: selectedLayer.value.warp.points[index].x, 
        y: selectedLayer.value.warp.points[index].y 
      };
    }
    
    // Update the point directly to avoid structuredClone issues
    if (selectedLayer.value && selectedLayer.value.warp && selectedLayer.value.warp.points) {
      selectedLayer.value.warp.points[index] = { 
        x: position.x, 
        y: position.y 
      };
    }
  }
};

// Handle warp point pointer up to record the command
const finalizeWarpPointUpdate = (index) => {
  if (selectedLayer.value?.warp?.enabled && warpPointOriginalPositions.value[index]) {
    const layerId = selectedLayer.value.id;
    const newPosition = { 
      x: selectedLayer.value.warp.points[index].x,
      y: selectedLayer.value.warp.points[index].y
    };
    const oldPosition = warpPointOriginalPositions.value[index];
    
    // Only record if position actually changed
    if (newPosition.x !== oldPosition.x || newPosition.y !== oldPosition.y) {
      // Create a safe command for updating warp point
      const command = {
        type: 'UPDATE_WARP_POINT',
        execute() {
          const layer = layersStore.layers.find(l => l.id === layerId);
          if (layer?.warp?.points?.[index]) {
            layer.warp.points[index] = { x: newPosition.x, y: newPosition.y };
          }
        },
        undo() {
          const layer = layersStore.layers.find(l => l.id === layerId);
          if (layer?.warp?.points?.[index]) {
            layer.warp.points[index] = { x: oldPosition.x, y: oldPosition.y };
          }
        },
        timestamp: Date.now(),
        description: `Update warp point ${index} of layer ${layerId}`
      };
      
      // Add the command to history
      historyStore.pushCommand(command);
    }
    
    // Clear the original position
    delete warpPointOriginalPositions.value[index];
  }
};

// Listen for warp handle pointer up events
onMounted(() => {
  // Add event listener for warp handle pointer up
  window.addEventListener('warpHandlePointerUp', (e) => {
    if (e.detail && e.detail.id && typeof e.detail.id === 'string') {
      // Extract index from ID (format: "layerId-index")
      const parts = e.detail.id.split('-');
      if (parts.length === 2) {
        const index = parseInt(parts[1], 10);
        if (!isNaN(index)) {
          finalizeWarpPointUpdate(index);
        }
      }
    }
  });
  
  // Enable edit mode by default
  if (selectedLayer.value && !selectedLayer.value.warp?.enabled) {
    layersStore.updateLayer(selectedLayer.value.id, {
      warp: { ...selectedLayer.value.warp, enabled: true },
    });
  }
});

onUnmounted(() => {
  // Remove event listener
  window.removeEventListener('warpHandlePointerUp', finalizeWarpPointUpdate);
});

const drawSelectionOutline = (graphics) => {
  const layer = selectedLayer.value;
  if (!layer?.warp?.enabled) {
    graphics.clear();
    return;
  }

  const points = layer.warp.points;
  if (!points?.length) return;

  graphics.clear();
  graphics.lineStyle(2, 0x12B0FF, 1);
  graphics.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    graphics.lineTo(points[i].x, points[i].y);
  }
  graphics.closePath();
};

// Handle pointer down event
function onPointerDown(event) {
  try {
    const target = event.currentTarget;
    if (!target) return;
    
    // Get layer ID from target
    const layerId = parseInt(target.layerId || target.dataset?.layerId);
    if (!layerId) return;
    
    // Find layer
    const layer = layersStore.layers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Get pointer position
    let pointerX, pointerY;
    
    if (event.data && event.data.global) {
      pointerX = event.data.global.x;
      pointerY = event.data.global.y;
    } else if (event.global) {
      pointerX = event.global.x;
      pointerY = event.global.y;
    } else if (event.clientX !== undefined) {
      const pos = getCanvasPosition(event.clientX, event.clientY);
      if (pos) {
        pointerX = pos.x;
        pointerY = pos.y;
      }
    }
    
    if (pointerX === undefined || pointerY === undefined) return;
    
    // Calculate offset from pointer to layer origin
    const offsetX = pointerX - layer.x;
    const offsetY = pointerY - layer.y;
    
    // Store drag data
    target._dragData = {
      layerId,
      offsetX,
      offsetY,
      startX: layer.x,
      startY: layer.y,
      // Store a deep copy of the initial warp points
      startWarpPoints: layer.warp && layer.warp.points ? 
        layer.warp.points.map(p => ({ x: p.x, y: p.y })) : 
        []
    };
    
    // Set up pointer capture
    if (typeof target.setPointerCapture === 'function' && event.pointerId !== undefined) {
      target.setPointerCapture(event.pointerId);
    }
    
    // Add event listeners
    if (typeof target.addEventListener === 'function') {
      target.addEventListener('pointermove', onPointerMove);
      target.addEventListener('pointerup', onPointerUp);
      target.addEventListener('pointercancel', onPointerUp);
    }
    
    // Stop event propagation
    event.stopPropagation();
  } catch (err) {
    console.error('Error in onPointerDown:', err);
  }
}
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000000;
  overflow: hidden;
}
</style> 