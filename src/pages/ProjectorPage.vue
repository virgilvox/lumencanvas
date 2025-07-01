<template>
  <div class="projector-page">
    <div v-if="!isFullscreen || showControls" class="projector-header">
      <h1>LumenCanvas Preview</h1>
      <div class="controls">
        <button @click="toggleFullscreen" class="control-btn">
          <span v-if="isFullscreen">Exit Fullscreen</span>
          <span v-else>Fullscreen</span>
        </button>
      </div>
    </div>
    
    <div 
      class="projector-container" 
      ref="projectorContainerRef"
      @mousemove="handleMouseMove"
      @click="handleClick"
    >
      <div 
        class="projector-canvas"
        :style="{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          transform: `scale(${zoom})`,
          backgroundColor: background === 'dark' ? '#333' : 
                          background === 'light' ? '#fff' : 'transparent'
        }"
      >
        <!-- Render layers here -->
        <div v-if="layers.length === 0" class="no-layers">
          No layers to preview
        </div>
        <template v-for="layer in visibleLayers" :key="layer.id">
          <div 
            class="layer"
            :style="{
              position: 'absolute',
              left: `${layer.x}px`,
              top: `${layer.y}px`,
              transform: `rotate(${layer.rotation || 0}deg) scale(${layer.scale?.x || 1}, ${layer.scale?.y || 1})`,
              opacity: layer.opacity,
              zIndex: layer.zIndex || 0
            }"
          >
            <!-- Image Layer -->
            <img 
              v-if="layer.type === 'image' && layer.content?.src" 
              :src="layer.content.src" 
              alt="Layer image"
              class="layer-content"
            />
            
            <!-- Video Layer -->
            <video 
              v-else-if="layer.type === 'video' && layer.content?.src" 
              :src="layer.content.src" 
              autoplay
              loop
              muted
              class="layer-content"
            ></video>
            
            <!-- URL Layer -->
            <iframe 
              v-else-if="layer.type === 'url' && layer.content?.url" 
              :src="layer.content.url" 
              class="layer-content"
              frameborder="0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            ></iframe>
            
            <!-- HTML Layer -->
            <div 
              v-else-if="layer.type === 'html'" 
              class="layer-content html-layer"
              v-html="layer.content?.html"
            ></div>
            
            <!-- Shader Layer (placeholder) -->
            <div 
              v-else-if="layer.type === 'shader'" 
              class="layer-content shader-layer"
            >
              <div class="shader-placeholder">Shader Preview</div>
            </div>
            
            <!-- Fallback -->
            <div v-else class="layer-content unknown-layer">
              Unknown Layer Type
            </div>
            
            <!-- Warp handles (if layer is selected and has warp points) -->
            <template v-if="layer.warp?.enabled && layer.warp.points && layer.selected">
              <div 
                v-for="(point, index) in layer.warp.points" 
                :key="`warp-${layer.id}-${index}`"
                class="warp-handle"
                :style="{
                  left: `${point.x}px`,
                  top: `${point.y}px`
                }"
              ></div>
            </template>
          </div>
        </template>
      </div>
    </div>
    
    <div v-if="!isFullscreen || showControls" class="projector-footer">
      <div class="zoom-controls">
        <button @click="adjustZoom(-0.1)" class="zoom-btn">-</button>
        <span class="zoom-value">{{ Math.round(zoom * 100) }}%</span>
        <button @click="adjustZoom(0.1)" class="zoom-btn">+</button>
      </div>
      
      <div class="background-controls">
        <span>Background:</span>
        <div class="bg-options">
          <button 
            v-for="bg in backgroundOptions" 
            :key="bg.value"
            class="bg-option"
            :class="{ active: background === bg.value }"
            :style="{ backgroundColor: bg.color }"
            @click="background = bg.value"
            :title="bg.label"
          ></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useProjectStore } from '../store/project';
import { useLayersStore } from '../store/layers';

// Get project ID from route params
const route = useRoute();
const projectId = route.params.id;

// Stores
const projectStore = useProjectStore();
const layersStore = useLayersStore();

// State
const layers = ref([]);
const canvasWidth = ref(1280);
const canvasHeight = ref(720);
const zoom = ref(1);
const background = ref('dark');
const isFullscreen = ref(false);
const showControls = ref(true);
const controlsTimeout = ref(null);
const projectorContainerRef = ref(null);
const lastMouseMoveTime = ref(Date.now());
const broadcastChannel = ref(null);
const refreshInterval = ref(null);

// Background options
const backgroundOptions = [
  { value: 'transparent', label: 'Transparent', color: 'transparent' },
  { value: 'light', label: 'Light', color: '#ffffff' },
  { value: 'dark', label: 'Dark', color: '#333333' },
  { value: 'checkerboard', label: 'Checkerboard', color: '#f0f0f0' }
];

// Computed properties
const visibleLayers = computed(() => {
  return layers.value.filter(layer => layer.visible !== false);
});

// Adjust zoom
function adjustZoom(delta) {
  const newZoom = zoom.value + delta;
  
  // Limit zoom range
  if (newZoom >= 0.1 && newZoom <= 3) {
    zoom.value = newZoom;
  }
}

// Toggle fullscreen
function toggleFullscreen() {
  if (isFullscreen.value) {
    exitFullscreen();
  } else {
    enterFullscreen();
  }
}

// Enter fullscreen
function enterFullscreen() {
  const container = projectorContainerRef.value;
  if (!container) return;
  
  if (container.requestFullscreen) {
    container.requestFullscreen();
  } else if (container.webkitRequestFullscreen) {
    container.webkitRequestFullscreen();
  } else if (container.msRequestFullscreen) {
    container.msRequestFullscreen();
  }
}

// Exit fullscreen
function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}

// Handle fullscreen change
function handleFullscreenChange() {
  isFullscreen.value = Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
  
  // Show controls briefly when entering fullscreen
  if (isFullscreen.value) {
    showControls.value = true;
    startControlsTimeout();
  } else {
    showControls.value = true;
    clearControlsTimeout();
  }
}

// Handle mouse movement to show controls
function handleMouseMove() {
  lastMouseMoveTime.value = Date.now();
  
  if (isFullscreen.value && !showControls.value) {
    showControls.value = true;
    startControlsTimeout();
  }
}

// Handle click to toggle controls in fullscreen
function handleClick() {
  if (isFullscreen.value) {
    showControls.value = !showControls.value;
    if (showControls.value) {
      startControlsTimeout();
    } else {
      clearControlsTimeout();
    }
  }
}

// Start timeout to hide controls
function startControlsTimeout() {
  clearControlsTimeout();
  controlsTimeout.value = setTimeout(() => {
    // Only hide if mouse hasn't moved recently
    if (Date.now() - lastMouseMoveTime.value > 2000) {
      showControls.value = false;
    } else {
      // If mouse moved recently, try again
      startControlsTimeout();
    }
  }, 3000);
}

// Clear controls timeout
function clearControlsTimeout() {
  if (controlsTimeout.value) {
    clearTimeout(controlsTimeout.value);
    controlsTimeout.value = null;
  }
}

// Handle keyboard shortcuts
function handleKeyDown(event) {
  if (event.key === 'f' || event.key === 'F') {
    toggleFullscreen();
  } else if (event.key === '+' || event.key === '=') {
    adjustZoom(0.1);
  } else if (event.key === '-') {
    adjustZoom(-0.1);
  } else if (event.key === 'Escape' && isFullscreen.value) {
    exitFullscreen();
  } else if (event.key === 'c' || event.key === 'C') {
    showControls.value = !showControls.value;
    if (showControls.value) {
      startControlsTimeout();
    }
  }
}

// Handle storage events for real-time sync
function handleStorageChange(event) {
  if (event.key === 'previewUpdate' || event.key === 'editorUpdate') {
    try {
      const data = JSON.parse(event.newValue || sessionStorage.getItem(event.key));
      if (data) {
        if (data.layers) layers.value = data.layers;
        if (data.canvasWidth) canvasWidth.value = data.canvasWidth;
        if (data.canvasHeight) canvasHeight.value = data.canvasHeight;
      }
    } catch (error) {
      console.error('Failed to parse preview update data:', error);
    }
  }
}

// Setup broadcast channel for real-time updates
function setupBroadcastChannel() {
  try {
    broadcastChannel.value = new BroadcastChannel('lumencanvas-updates');
    
    broadcastChannel.value.onmessage = (event) => {
      const data = event.data;
      
      if (data.type === 'project-update') {
        if (data.layers) layers.value = [...data.layers];
        if (data.canvasWidth) canvasWidth.value = data.canvasWidth;
        if (data.canvasHeight) canvasHeight.value = data.canvasHeight;
      }
    };
  } catch (error) {
    console.warn('BroadcastChannel not supported, falling back to polling');
    // Set up polling refresh instead
    setupPollingRefresh();
  }
}

// Setup polling for updates if broadcast channel isn't available
function setupPollingRefresh() {
  refreshInterval.value = setInterval(() => {
    if (projectId) {
      refreshProjectData();
    }
  }, 2000); // Poll every 2 seconds
}

// Refresh project data without full reload
async function refreshProjectData() {
  try {
    // Get fresh layers from store
    if (layersStore.layers && layersStore.layers.length > 0) {
      layers.value = JSON.parse(JSON.stringify(layersStore.layers));
    }
    
    // Update canvas dimensions from project store
    canvasWidth.value = projectStore.canvasWidth;
    canvasHeight.value = projectStore.canvasHeight;
  } catch (error) {
    console.error('Failed to refresh project data:', error);
  }
}

// Load project data
async function loadProjectData() {
  if (!projectId) {
    console.error('No project ID provided');
    return;
  }
  
  try {
    // Load project from store
    await projectStore.loadProject(projectId);
    
    // Set canvas dimensions
    canvasWidth.value = projectStore.canvasWidth || 1280;
    canvasHeight.value = projectStore.canvasHeight || 720;
    
    // Get layers from store
    if (layersStore.layers && layersStore.layers.length > 0) {
      // Clone to avoid reactivity issues
      layers.value = JSON.parse(JSON.stringify(layersStore.layers));
    } else {
      console.warn('No layers found in layersStore');
      layers.value = [];
    }
    
    // Broadcast our presence to the editor
    sendPresenceSignal();
  } catch (error) {
    console.error('Failed to load project data:', error);
    
    // Fallback to session storage
    loadFromSessionStorage();
  }
}

// Send a presence signal to the editor window
function sendPresenceSignal() {
  try {
    if (broadcastChannel.value) {
      broadcastChannel.value.postMessage({
        type: 'projector-connected',
        projectId: projectId
      });
    }
    
    // Also try window.opener if available
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: 'projector-connected',
        projectId: projectId
      }, '*');
    }
  } catch (error) {
    console.warn('Failed to send presence signal:', error);
  }
}

// Load from session storage (fallback)
function loadFromSessionStorage() {
  try {
    const previewData = sessionStorage.getItem('previewData');
    if (previewData) {
      const data = JSON.parse(previewData);
      if (data.layers) layers.value = data.layers;
      if (data.canvasWidth) canvasWidth.value = data.canvasWidth;
      if (data.canvasHeight) canvasHeight.value = data.canvasHeight;
    }
  } catch (error) {
    console.error('Failed to load initial preview data:', error);
  }
}

// Handle window messages from editor
function handleWindowMessage(event) {
  try {
    const data = event.data;
    
    if (data && data.type === 'project-update') {
      if (data.layers) layers.value = [...data.layers];
      if (data.canvasWidth) canvasWidth.value = data.canvasWidth;
      if (data.canvasHeight) canvasHeight.value = data.canvasHeight;
    }
  } catch (error) {
    console.error('Failed to handle window message:', error);
  }
}

// Lifecycle hooks
onMounted(() => {
  // Set up real-time communication
  setupBroadcastChannel();
  
  // Load initial project data
  loadProjectData();
  
  // Set up event listeners
  window.addEventListener('storage', handleStorageChange);
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);
  
  // Listen for messages from editor window
  window.addEventListener('message', handleWindowMessage);
  
  // Auto-fit to window
  adjustZoomToFit();
});

onUnmounted(() => {
  // Clean up event listeners
  window.removeEventListener('storage', handleStorageChange);
  window.removeEventListener('message', handleWindowMessage);
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
  
  // Clear any timeouts and intervals
  clearControlsTimeout();
  if (refreshInterval.value) clearInterval(refreshInterval.value);
  
  // Close broadcast channel
  if (broadcastChannel.value) {
    broadcastChannel.value.close();
  }
});

// Auto-adjust zoom to fit the window
function adjustZoomToFit() {
  if (!canvasWidth.value || !canvasHeight.value) return;
  
  const container = projectorContainerRef.value;
  if (!container) return;
  
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  
  // Calculate zoom to fit both dimensions with some padding
  const widthRatio = (containerWidth - 40) / canvasWidth.value;
  const heightRatio = (containerHeight - 40) / canvasHeight.value;
  
  // Use the smaller ratio to ensure the canvas fits
  zoom.value = Math.min(widthRatio, heightRatio, 1);
}
</script>

<style scoped>
.projector-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #0b0b0c;
  color: #E0E0E0;
}

.projector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #1a1a1a;
  border-bottom: 1px solid #333;
  transition: opacity 0.3s ease;
}

.projector-header h1 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 500;
}

.controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  background-color: #333;
  border: none;
  color: #E0E0E0;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.control-btn:hover {
  background-color: #444;
}

.projector-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background-color: #111;
  position: relative;
}

.projector-canvas {
  position: relative;
  transform-origin: center;
  transition: transform 0.2s ease;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.projector-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #1a1a1a;
  border-top: 1px solid #333;
  transition: opacity 0.3s ease;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zoom-btn {
  background-color: #333;
  border: none;
  color: #fff;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.zoom-btn:hover {
  background-color: #444;
}

.zoom-value {
  min-width: 50px;
  text-align: center;
  font-size: 0.9rem;
}

.background-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bg-options {
  display: flex;
  gap: 4px;
}

.bg-option {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #444;
  transition: all 0.2s;
}

.bg-option.active {
  border-color: #42b883;
  box-shadow: 0 0 0 2px rgba(66, 184, 131, 0.5);
}

.bg-option[title="Transparent"] {
  background-image: linear-gradient(45deg, #333 25%, transparent 25%),
                    linear-gradient(-45deg, #333 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #333 75%),
                    linear-gradient(-45deg, transparent 75%, #333 75%);
  background-size: 10px 10px;
  background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
}

.bg-option[title="Checkerboard"] {
  background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
                    linear-gradient(-45deg, #ccc 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #ccc 75%),
                    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

.layer {
  position: absolute;
  transform-origin: center;
}

.layer-content {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.html-layer {
  background-color: rgba(255, 255, 255, 0.1);
  padding: 8px;
  min-width: 100px;
  min-height: 100px;
}

.shader-layer {
  background-color: rgba(0, 0, 0, 0.3);
  min-width: 200px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shader-placeholder {
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.2rem;
}

.unknown-layer {
  background-color: rgba(255, 0, 0, 0.2);
  min-width: 100px;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
}

.no-layers {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 1.2rem;
}

.warp-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: #42b883;
  border: 2px solid white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
</style> 