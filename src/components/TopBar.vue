<template>
  <header class="top-bar">
    <div class="left-tools">
      <div class="logo">LumenCanvas</div>
    </div>

    <div class="center-tools">
      <div class="tool-group segmented">
        <button class="tool-button">Scene ▾</button>
        <button class="tool-button" @click="addImageLayer">+Layer</button>
        <button class="tool-button" @click="toggleMask">Mask (M)</button>
        <button class="tool-button" @click="addShaderLayer">Shader (F2)</button>
        <button class="tool-button" @click="togglePreview">Preview (P)</button>
      </div>
      
      <div class="tool-group">
        <button 
          class="tool-button"
          @click="historyStore.undo()"
          :disabled="!historyStore.canUndo"
          title="Undo (Ctrl+Z)"
        >
          <Undo :size="16" />
        </button>
        <button 
          class="tool-button"
          @click="historyStore.redo()"
          :disabled="!historyStore.canRedo"
          title="Redo (Ctrl+Y)"
        >
          <Redo :size="16" />
        </button>
      </div>
    </div>

    <div class="right-tools">
      <div class="tool-group">
        <button 
          class="tool-button"
          @click="handleExport"
          :disabled="projectStore.filePickerActive"
          title="Export Project"
        >
          <Download :size="16" />
        </button>
        <button 
          class="tool-button"
          @click="handleImport"
          :disabled="projectStore.filePickerActive"
          title="Import Project"
        >
          <Upload :size="16" />
        </button>
        <button 
          class="tool-button save-button"
          :disabled="projectStore.isSaving"
        >
          <Save :size="16" />
          {{ saveStatus }}
        </button>
        <div class="user-avatar">G</div>
      </div>
    </div>
    
    <!-- Toast notification -->
    <div class="toast-container" v-if="showToast">
      <div class="toast">
        {{ toastMessage }}
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, ref } from 'vue';
import { Save, Download, Upload, Undo, Redo } from 'lucide-vue-next';
import { useLayersStore } from '../store/layers';
import { useProjectStore } from '../store/project';
import { useHistoryStore } from '../store/history';

const layersStore = useLayersStore();
const projectStore = useProjectStore();
const historyStore = useHistoryStore();
const { LayerTypes, addLayer } = layersStore;

// Toast notification state
const showToast = ref(false);
const toastMessage = ref('');

// Show a toast message
function showToastMessage(message, duration = 3000) {
  toastMessage.value = message;
  showToast.value = true;
  
  setTimeout(() => {
    showToast.value = false;
  }, duration);
}

// Handle export with error handling
async function handleExport() {
  if (projectStore.filePickerActive) {
    showToastMessage('A file operation is already in progress');
    return;
  }
  
  try {
    await projectStore.exportAsZip();
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      showToastMessage('Cannot open multiple file dialogs at once');
    } else {
      showToastMessage('Failed to export project');
      console.error(error);
    }
  }
}

// Handle import with error handling
async function handleImport() {
  if (projectStore.filePickerActive) {
    showToastMessage('A file operation is already in progress');
    return;
  }
  
  try {
    await projectStore.importFromZip();
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      showToastMessage('Cannot open multiple file dialogs at once');
    } else {
      showToastMessage('Failed to import project');
      console.error(error);
    }
  }
}

// Computed properties
const saveStatus = computed(() => {
  if (projectStore.isSaving) return 'Saving...';
  if (projectStore.lastSaved) {
    const seconds = Math.floor((Date.now() - projectStore.lastSaved.getTime()) / 1000);
    if (seconds < 5) return 'Saved';
    if (seconds < 60) return `Saved ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Saved ${minutes}m ago`;
    return 'Saved';
  }
  return 'Save';
});

function addImageLayer() {
  // For now, default to image layer. Later we can show a menu
  addLayer(LayerTypes.IMAGE);
}

function addShaderLayer() {
  addLayer(LayerTypes.SHADER);
}

function toggleMask() {
  // TODO: Implement masking functionality
  console.log('Mask toggle - to be implemented');
}

function togglePreview() {
  // TODO: Implement preview/projector view
  console.log('Preview toggle - to be implemented');
}

</script>

<style scoped>
.top-bar {
  height: 48px;
  background-color: #0b0b0c;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #222;
  position: relative;
}

.left-tools, .center-tools, .right-tools {
  display: flex;
  align-items: center;
  gap: 16px;
}

.center-tools {
  flex-grow: 1;
  justify-content: center;
}

.logo {
  font-weight: 500;
  font-size: 16px;
}

.tool-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tool-group.segmented button {
  border-radius: 0;
  border-right: 1px solid #222;
}

.tool-group.segmented button:first-child {
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
}

.tool-group.segmented button:last-child {
  border-right: none;
  border-top-right-radius: 6px;
  border-bottom-right-radius: 6px;
}

.tool-button {
  background-color: #1e1e1e;
  border: 1px solid #333;
  color: #E0E0E0;
  padding: 6px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
}

.tool-button:hover:not(:disabled) {
  background-color: #2a2a2a;
}

.tool-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-button {
  gap: 8px;
  background-color: #12B0FF;
  color: #000;
  font-weight: 500;
}

.save-button:hover:not(:disabled) {
  background-color: #4acbff;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #333;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 14px;
}

/* Toast notification styles */
.toast-container {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 400px;
  pointer-events: none;
}

.toast {
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 16px;
  border-radius: 4px;
  margin-top: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  font-size: 14px;
  animation: fade-in 0.3s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style> 