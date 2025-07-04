<template>
  <div class="projector-page" ref="projectorPageRef" @click="enterFullscreen">
    <div 
      class="projector-container"
      ref="projectorContainerRef"
      :style="containerStyle"
    >
      <div class="projector-wrapper" :style="wrapperStyle">
        <Application
          ref="appRef"
          :width="canvasWidth"
          :height="canvasHeight"
          :background="canvasBackground"
          :antialias="true"
        >
          <container>
            <LayerRenderer
              v-for="layer in reversedLayers"
              :key="layer.id"
              :layer="layer"
            />
          </container>
        </Application>
        
        <!-- Warped iframes are rendered here in a separate overlay -->
        <div class="iframe-overlay">
          <WarpedIframe
            v-for="layer in urlLayers"
            :key="`${layer.id}-${layer.content.url}-${layer.width}-${layer.height}`"
            :layer="layer"
            :canvas-width="canvasWidth"
            :canvas-height="canvasHeight"
          />
        </div>
      </div>
    </div>

    <button v-if="!isFullscreen" @click.stop="enterFullscreen" class="fullscreen-button">
      Fullscreen
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSync } from '../composables/useSync';
import { Application } from 'vue3-pixi';
import LayerRenderer from '../components/layers/LayerRenderer.vue';
import WarpedIframe from '../components/layers/WarpedIframe.vue';
import { useLayersStore } from '../store/layers';
import api from '../services/api';

const route = useRoute();
const projectId = route.params.id;

const layers = ref([]);
const canvasWidth = ref(1280);
const canvasHeight = ref(720);
const canvasBackground = ref(0x000000);

const projectorPageRef = ref(null);
const isFullscreen = ref(false);
const layersStore = useLayersStore();
const scale = ref(1);

let yjs_instance = null;

// This will make sure that yjs changes are applied reactively
const yLayers = ref([]);

const reversedLayers = computed(() => [...yLayers.value].reverse());

const urlLayers = computed(() => {
  return reversedLayers.value.filter(layer => layer.type === layersStore.LayerTypes.URL && layer.visible);
});

const enterFullscreen = () => {
  if (projectorPageRef.value && !document.fullscreenElement) {
    projectorPageRef.value.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    });
  }
};

const containerStyle = computed(() => ({
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
}));

const wrapperStyle = computed(() => ({
    position: 'relative',
    width: `${canvasWidth.value}px`,
    height: `${canvasHeight.value}px`,
    transform: `scale(${scale.value})`,
    transformOrigin: 'center center',
}));

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

onMounted(() => {
  if (projectId) {
    yjs_instance = useSync(projectId);

    const { yLayers: yjsLayers, yCanvas, connectionStatus, synced } = yjs_instance;

    watch(connectionStatus, (status) => {
      if (status === 'disconnected' || status === 'error') {
        // Fallback to fetching from API if WebSocket fails
        console.warn('WebSocket connection failed, falling back to API.');
        loadProjectFromApi();
      }
    });

    const updateLocalState = (events) => {
      // Ensure events is always an array
      const eventArray = Array.isArray(events) ? events : [events];
      
      eventArray.forEach(event => {
        if (event.target === yjsLayers) {
          // Handle array changes (add/remove layers)
          let index = 0;
          event.changes.delta.forEach(op => {
            if (op.retain) {
              index += op.retain;
            } else if (op.insert) {
              // Using toJS to get plain objects, assuming they are new
              const newItems = op.insert.map(item =>
                item && typeof item.toJSON === 'function' ? item.toJSON() : item
              );
              yLayers.value.splice(index, 0, ...newItems);
              index += newItems.length;
            } else if (op.delete) {
              yLayers.value.splice(index, op.delete);
            }
          });
        } else if (event.target === yCanvas) {
          // Handle canvas property changes
          event.changes.keys.forEach((change, key) => {
            if (key === 'width') canvasWidth.value = yCanvas.get('width');
            if (key === 'height') canvasHeight.value = yCanvas.get('height');
            if (key === 'background') {
              const bgColor = yCanvas.get('background') || '#000000';
              canvasBackground.value = parseInt(bgColor.replace('#', '0x'));
            }
          });
        } else {
            // This handles changes to individual layer objects within the array
            const updatedLayer = (event.target && typeof event.target.toJSON === 'function')
              ? event.target.toJSON()
              : event.target;
            const layerIndex = yLayers.value.findIndex(l => l.id === updatedLayer.id);
            if (layerIndex > -1) {
              Object.assign(yLayers.value[layerIndex], updatedLayer);
            }
        }
      });
    };
    
    yjsLayers.observeDeep(updateLocalState);
    yCanvas.observe(updateLocalState);

    // Initial sync using the 'synced' state
    const stopWatchingSync = watch(synced, (isSynced) => {
      if (isSynced) {
        yLayers.value = yjsLayers.toArray();
        canvasWidth.value = yCanvas.get('width') || 1280;
        canvasHeight.value = yCanvas.get('height') || 720;
        const bgColor = yCanvas.get('background') || '#000000';
        canvasBackground.value = parseInt(bgColor.replace('#', '0x'));
        
        // Stop watching once synced to prevent re-loading on reconnects
        stopWatchingSync();
      }
    }, { immediate: true });

    // Fallback if not synced after a timeout
    const syncTimeout = setTimeout(() => {
      if(!synced.value) {
        loadProjectFromApi();
      }
    }, 3000);

    onUnmounted(() => {
      clearTimeout(syncTimeout);
    });
  }

  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

async function loadProjectFromApi() {
  try {
    const project = await api.projects.get(projectId);
    if (project) {
      yLayers.value = project.layers || [];
      canvasWidth.value = project.canvas?.width || 1280;
      canvasHeight.value = project.canvas?.height || 720;
      const bgColor = project.canvas?.background || '#000000';
      canvasBackground.value = parseInt(bgColor.replace('#', '0x'));
    }
  } catch (err) {
    console.error(`Failed to fetch project ${projectId} from API:`, err);
  }
}

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
});

</script>

<style scoped>
.projector-page {
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  cursor: none;
}

.projector-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  transform-origin: center center;
}

.projector-wrapper {
  position: relative;
}

.fullscreen-button {
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 10px 20px;
  background: rgba(255,255,255,0.2);
  color: white;
  border: 1px solid white;
  border-radius: 5px;
  cursor: pointer;
  z-index: 100;
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.fullscreen-button:hover {
  opacity: 1;
}

/* Hide button when in fullscreen */
.projector-page:fullscreen .fullscreen-button {
  display: none;
}

.iframe-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Let clicks pass through to the canvas */
  transform-origin: 0 0;
}
</style>