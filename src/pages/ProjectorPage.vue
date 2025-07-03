<template>
  <div class="projector-page" ref="projectorPageRef" @click="enterFullscreen">
    <div 
      class="projector-container"
      ref="projectorContainerRef"
    >
      <Application
        ref="appRef"
        :width="canvasWidth"
        :height="canvasHeight"
        :background="canvasBackground"
        :antialias="true"
      >
        <container>
          <LayerRenderer
            v-for="layer in layers"
            :key="layer.id"
            :layer="layer"
          />
        </container>
      </Application>
    </div>

    <button v-if="!isFullscreen" @click.stop="enterFullscreen" class="fullscreen-button">
      Fullscreen
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSync } from '../composables/useSync';
import { Application } from 'vue3-pixi';
import LayerRenderer from '../components/layers/LayerRenderer.vue';

const route = useRoute();
const projectId = route.params.id;

const layers = ref([]);
const canvasWidth = ref(1280);
const canvasHeight = ref(720);
const canvasBackground = ref(0x000000);

const projectorPageRef = ref(null);
const isFullscreen = ref(false);

let yjs_instance = null;

const enterFullscreen = () => {
  if (projectorPageRef.value && !document.fullscreenElement) {
    projectorPageRef.value.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    });
  }
};

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

onMounted(() => {
  if (projectId) {
    yjs_instance = useSync(projectId);

    const { yLayers, yCanvas, connectionStatus } = yjs_instance;

    watch(connectionStatus, (status) => {
      if (status === 'disconnected' || status === 'error') {
        // Fallback to fetching from API if WebSocket fails
        console.warn('WebSocket connection failed, falling back to API.');
        loadProjectFromApi();
      }
    });

    const updateLocalState = () => {
      layers.value = yLayers.toArray();
      canvasWidth.value = yCanvas.get('width') || 1280;
      canvasHeight.value = yCanvas.get('height') || 720;
      const bgColor = yCanvas.get('background') || '#000000';
      canvasBackground.value = parseInt(bgColor.replace('#', '0x'));
    };
    
    yLayers.observe(updateLocalState);
    yCanvas.observe(updateLocalState);

    // Initial sync - if not connected after a short delay, fetch from API
    setTimeout(() => {
      if (connectionStatus.value !== 'connected') {
        loadProjectFromApi();
      } else {
        updateLocalState();
      }
    }, 1500);
  }

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  
  // Enter fullscreen on first click
  projectorPageRef.value?.addEventListener('click', enterFullscreen, { once: true });
});

async function loadProjectFromApi() {
  try {
    const project = await api.projects.get(projectId);
    if (project) {
      layers.value = project.layers || [];
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
</style>