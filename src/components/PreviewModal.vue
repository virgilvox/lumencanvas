<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click="close">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h3>Preview</h3>
            <div class="header-actions">
              <button @click="openInNewTab" class="action-btn" title="Open in New Tab">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
              <button @click="toggleFullscreen" class="action-btn" :title="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'">
                <svg v-if="isFullscreen" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
              </button>
              <button @click="close" class="action-btn close-btn" title="Close (Esc)">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="preview-container" ref="previewContainerRef">
            <div class="preview-canvas">
              <!-- Canvas preview content -->
              <slot name="preview-content">
                <div class="preview-placeholder">
                  <p>Preview content will be displayed here</p>
                </div>
              </slot>
            </div>
          </div>
          
          <div class="modal-footer">
            <div class="preview-controls">
              <div class="control-group">
                <label>Zoom:</label>
                <div class="zoom-controls">
                  <button @click="adjustZoom(-0.1)" class="zoom-btn">-</button>
                  <span class="zoom-value">{{ Math.round(zoom * 100) }}%</span>
                  <button @click="adjustZoom(0.1)" class="zoom-btn">+</button>
                </div>
              </div>
              
              <div class="control-group">
                <label>Background:</label>
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
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useProjectStore } from '../store/project';
import { useLayersStore } from '../store/layers';

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['update:modelValue']);

// State
const isFullscreen = ref(false);
const zoom = ref(1);
const background = ref('transparent');
const previewContainerRef = ref(null);
const projectStore = useProjectStore();
const layersStore = useLayersStore();

// Background options
const backgroundOptions = [
  { value: 'transparent', label: 'Transparent', color: 'transparent' },
  { value: 'light', label: 'Light', color: '#ffffff' },
  { value: 'dark', label: 'Dark', color: '#333333' },
  { value: 'checkerboard', label: 'Checkerboard', color: '#f0f0f0' }
];

// Close modal
function close() {
  emit('update:modelValue', false);
  
  // Exit fullscreen if active
  if (isFullscreen.value) {
    exitFullscreen();
  }
}

// Open preview in new tab
function openInNewTab() {
  // Create a URL with project state
  const projectData = {
    id: projectStore.currentProject?.id,
    canvasWidth: projectStore.canvasWidth,
    canvasHeight: projectStore.canvasHeight,
    layers: layersStore.layers
  };
  
  // Create a new window with the project data
  const previewWindow = window.open('/projector', '_blank');
  
  // Store the data in sessionStorage to be accessed by the new window
  sessionStorage.setItem('previewData', JSON.stringify(projectData));
  
  // Set up real-time sync
  window.addEventListener('storage', handleStorageChange);
  
  // Close the modal
  close();
}

// Handle storage changes for real-time sync
function handleStorageChange(event) {
  if (event.key === 'editorUpdate') {
    // Update the preview window with new data
    const previewData = {
      layers: layersStore.layers,
      canvasWidth: projectStore.canvasWidth,
      canvasHeight: projectStore.canvasHeight
    };
    
    sessionStorage.setItem('previewUpdate', JSON.stringify(previewData));
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
  const container = previewContainerRef.value;
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

// Adjust zoom
function adjustZoom(delta) {
  const newZoom = zoom.value + delta;
  
  // Limit zoom range
  if (newZoom >= 0.1 && newZoom <= 3) {
    zoom.value = newZoom;
  }
}

// Handle keyboard shortcuts
function handleKeyDown(event) {
  if (!props.modelValue) return;
  
  if (event.key === 'Escape') {
    close();
  } else if (event.key === 'f' || event.key === 'F') {
    toggleFullscreen();
  } else if (event.key === '+' || event.key === '=') {
    adjustZoom(0.1);
  } else if (event.key === '-') {
    adjustZoom(-0.1);
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
}

// Watch for changes in the layers store and project store to sync with preview
watch([() => layersStore.layers, () => projectStore.canvasWidth, () => projectStore.canvasHeight], () => {
  // Update sessionStorage to sync with preview window
  const updateData = {
    layers: layersStore.layers,
    canvasWidth: projectStore.canvasWidth,
    canvasHeight: projectStore.canvasHeight
  };
  
  // Trigger storage event for real-time sync
  sessionStorage.setItem('editorUpdate', JSON.stringify(updateData));
}, { deep: true });

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
  window.removeEventListener('storage', handleStorageChange);
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-container {
  background-color: #1a1a1a;
  border-radius: 8px;
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #222;
  border-bottom: 1px solid #333;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: #fff;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  color: #fff;
  background-color: #333;
}

.close-btn:hover {
  color: #fff;
  background-color: #e53935;
}

.preview-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  background-color: #111;
  min-height: 300px;
}

.preview-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center;
  transition: transform 0.2s ease;
}

.preview-placeholder {
  padding: 2rem;
  text-align: center;
  color: #666;
}

.modal-footer {
  padding: 12px 16px;
  background-color: #222;
  border-top: 1px solid #333;
}

.preview-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group label {
  font-size: 0.9rem;
  color: #aaa;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
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
  color: #eee;
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

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style> 