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
import LayerRenderer from './layers/LayerRenderer.vue';
import WarpHandle from './WarpHandle.vue';

const layersStore = useLayersStore();
const projectStore = useProjectStore();
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
      offsetY
    };
    
    // Set up pointer move and pointer up handlers
    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
    target.addEventListener('pointercancel', onPointerUp);
    
    // Use pointer capture to ensure we get all events
    if (event.pointerId && target.setPointerCapture) {
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
    
    // Create updated layer data
    const updatedLayer = {
      x: newX,
      y: newY,
    };
    
    // Also update warp points if they exist
    if (layer.warp && layer.warp.points) {
      updatedLayer.warp = {
        ...layer.warp,
        points: layer.warp.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
      };
    }
    
    // Update the layer position
    layersStore.updateLayer(layer.id, updatedLayer);
  } catch (err) {
    console.error('Error in onPointerMove:', err);
  }
}

// Handle pointer up event
function onPointerUp(event) {
  try {
    const target = event.currentTarget;
    if (!target) return;
    
    // Release pointer capture
    if (event.pointerId && target.releasePointerCapture) {
      target.releasePointerCapture(event.pointerId);
    }
    
    // Clean up event listeners
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerup', onPointerUp);
    target.removeEventListener('pointercancel', onPointerUp);
    
    // Clear drag data
    delete target._dragData;
  } catch (err) {
    console.error('Error in onPointerUp:', err);
  }
}

const updateWarpPoint = (index, position) => {
  if (selectedLayer.value?.warp?.enabled) {
    const newPoints = [...selectedLayer.value.warp.points];
    newPoints[index] = { x: position.x, y: position.y };
    layersStore.updateLayer(selectedLayer.value.id, {
      warp: { ...selectedLayer.value.warp, points: newPoints }
    });
  }
};

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

// Enable edit mode by default on mount
onMounted(() => {
  if (selectedLayer.value && !selectedLayer.value.warp?.enabled) {
    layersStore.updateLayer(selectedLayer.value.id, {
      warp: { ...selectedLayer.value.warp, enabled: true },
    });
  }
});
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