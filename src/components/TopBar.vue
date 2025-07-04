<template>
  <header class="top-bar">
    <div class="left-tools">
      <router-link to="/dashboard" class="tool-button back-to-dashboard" title="Back to Dashboard">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </router-link>
      <div class="logo">{{ projectStore.projectName || 'LumenCanvas' }}</div>
    </div>

    <div class="center-tools">
      <div class="tool-group segmented">
        <button class="tool-button">Scene ▾</button>
        <button class="tool-button" @click="toggleMask">Mask (M)</button>
        <button class="tool-button" @click="togglePreview">Preview (P)</button>
      </div>
      
      <!-- Collaboration Status -->
      <div class="tool-group collaboration-status" v-if="collaborationStatus">
        <div 
          class="collab-indicator" 
          :class="collaborationStatus.connectionStatus"
          :title="`Collaboration: ${collaborationStatus.connectionStatus} - ${collaborationStatus.synced ? 'Synced' : 'Syncing...'}`"
        >
          <div class="collab-dot"></div>
          <span class="collab-text">{{ collaborationStatus.connectionStatus === 'connected' ? 'Live' : 'Offline' }}</span>
        </div>
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
        <button 
          class="tool-button"
          @click="toggleBackupManager"
          title="Backups & History"
        >
          <History :size="16" />
        </button>
      </div>
    </div>

    <div class="right-tools">
      <div class="tool-group">
        <button 
          class="tool-button projector-button"
          @click="openProjectorWindow"
          title="Open Projector View"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
          <span>Projector</span>
        </button>
        <button 
          class="tool-button"
          @click="toggleProjectSettings"
          title="Project Settings"
        >
          <Settings :size="16" />
        </button>
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
        <SignedIn>
          <UserButton after-sign-out-url="/" />
        </SignedIn>
        <SignedOut>
          <router-link to="/sign-in">
            <button class="tool-button">Sign In</button>
          </router-link>
        </SignedOut>
      </div>
    </div>
    
    <!-- Toast notification -->
    <div class="toast-container" v-if="showToast">
      <div class="toast">
        {{ toastMessage }}
      </div>
    </div>

    <!-- Preview Modal -->
    <PreviewModal 
      v-model="showPreviewModal"
    >
      <template #preview-content>
        <div class="preview-content">
          <!-- Here you would render your canvas content -->
          <div 
            class="preview-canvas"
            :style="{
              width: `${projectStore.canvasWidth}px`,
              height: `${projectStore.canvasHeight}px`,
              backgroundColor: '#000'
            }"
          >
            <!-- For now, just show a placeholder -->
            <div v-if="layersStore.layers.length === 0" class="no-layers">
              No layers to preview
            </div>
            <!-- In a real implementation, you would render the actual layers here -->
          </div>
        </div>
      </template>
    </PreviewModal>
    
    <!-- Backup Manager Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showBackupManager" class="modal-overlay" @click="closeBackupManager">
          <div class="modal-container" @click.stop>
            <div class="modal-header">
              <h3>Backups & History</h3>
              <button @click="closeBackupManager" class="close-btn">
                <X :size="16" />
              </button>
            </div>
            
            <div class="modal-content">
              <BackupManager />
            </div>
            
            <div class="modal-footer">
              <button @click="closeBackupManager" class="close-btn">Close</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- Project Settings Modal -->
    <ProjectSettingsModal v-model="showProjectSettings" @saved="handleProjectSettingsSaved" />
  </header>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { Save, Download, Upload, Undo, Redo, Settings, X, Monitor, History } from 'lucide-vue-next';
import { useLayersStore } from '../store/layers';
import { useProjectStore } from '../store/project';
import { useHistoryStore } from '../store/history';
import { useStorageService } from '../services/storage';
import { useRouter } from 'vue-router';
import PreviewModal from './PreviewModal.vue';
import BackupManager from './BackupManager.vue';
import ProjectSettingsModal from './ProjectSettingsModal.vue';
import { SignedIn, SignedOut, UserButton } from '@clerk/vue';

// Props
const props = defineProps({
  collaborationStatus: {
    type: Object,
    default: null
  }
});

const layersStore = useLayersStore();
const projectStore = useProjectStore();
const historyStore = useHistoryStore();
const router = useRouter();
const { LayerTypes, addLayer } = layersStore;
const { STORAGE_PROVIDERS, getCurrentStorageProvider, setStorageProvider } = useStorageService();

// Toast notification state
const showToast = ref(false);
const toastMessage = ref('');
const toastDuration = ref(3000);
const saveTimeout = ref(null);
const projectorWindow = ref(null);
const broadcastChannel = ref(null);
const showPreviewModal = ref(false);
const showBackupManager = ref(false);

// Project settings modal state
const showProjectSettings = ref(false);

// Show a toast message
function showToastMessage(message, duration = 3000) {
  toastMessage.value = message;
  toastDuration.value = duration;
  showToast.value = true;
  
  setTimeout(() => {
    showToast.value = false;
  }, duration);
}

// Create broadcast channel for projector communication
function setupBroadcastChannel() {
  try {
    // Close existing channel if any
    if (broadcastChannel.value) {
      broadcastChannel.value.close();
    }
    
    broadcastChannel.value = new BroadcastChannel('lumencanvas-updates');
    
    // Listen for messages from projector window
    broadcastChannel.value.onmessage = (event) => {
      if (event.data && event.data.type === 'projector-connected') {
        // Send current state when projector connects
        sendProjectorUpdate();
      }
    };
    
    // Set up watchers to send updates to projector
    watch([() => layersStore.layers, () => projectStore.canvasWidth, () => projectStore.canvasHeight], 
      () => {
        sendProjectorUpdate();
      }, 
      { deep: true }
    );
  } catch (error) {
    console.warn('BroadcastChannel not supported:', error);
  }
}

// Sanitize data for cloning by removing circular references and non-cloneable types
function sanitizeForCloning(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle primitive types
  if (typeof obj !== 'object') {
    return obj;
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return new Date(obj);
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForCloning(item));
  }
  
  // Handle regular objects
  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Skip functions and non-cloneable values
      if (typeof obj[key] !== 'function' && key !== '_app' && key !== '_value') {
        try {
          result[key] = sanitizeForCloning(obj[key]);
        } catch (error) {
          console.warn(`Could not clone property ${key}`, error);
        }
      }
    }
  }
  return result;
}

// Send project updates to projector
function sendProjectorUpdate() {
  try {
    // Create a sanitized copy of the project state to avoid DataCloneError
    const sanitizedLayers = sanitizeForCloning(layersStore.layers);
    
    // Send via BroadcastChannel if available
    if (broadcastChannel.value) {
      broadcastChannel.value.postMessage({
        type: 'project-update',
        layers: sanitizedLayers,
        canvasWidth: projectStore.canvasWidth,
        canvasHeight: projectStore.canvasHeight
      });
    }
    
    // Also try direct window messaging if we have a reference
    if (projectorWindow.value && !projectorWindow.value.closed) {
      projectorWindow.value.postMessage({
        type: 'project-update',
        layers: sanitizedLayers,
        canvasWidth: projectStore.canvasWidth,
        canvasHeight: projectStore.canvasHeight
      }, '*');
    }
  } catch (error) {
    console.warn('Failed to send projector update:', error);
  }
}

// Open projector in new window
function openProjectorWindow() {
  // Get the current project ID
  const projectId = projectStore.projectId;
  
  if (!projectId) {
    showToastMessage('No active project to preview');
    return;
  }

  // Check if file picker is active
  if (projectStore.filePickerActive) {
    showToastMessage('Cannot open projector while a file dialog is active');
    return;
  }

  try {
    // Create the URL for the projector view
    const projectorUrl = `/projector/${projectId}`;
    
    // Try to use window.open with a slight delay to avoid conflicts with file chooser dialogs
    setTimeout(() => {
      try {
        // Set up broadcast channel for communication before opening window
        setupBroadcastChannel();
        
        // Try to open the projector in a new window
        projectorWindow.value = window.open(projectorUrl, '_blank', 'width=1024,height=768');
        
        // If successful, set up message handling
        if (projectorWindow.value) {
          // Send initial data after a slight delay to allow the window to load
          setTimeout(() => {
            sendProjectorUpdate();
          }, 1000);
        } else {
          // Fallback if window.open is blocked or returns null
          showToastMessage('Popup blocked by browser. Using navigation instead.');
          router.push(projectorUrl);
        }
      } catch (error) {
        console.error('Error opening projector window:', error);
        showToastMessage('Failed to open projector. Using navigation instead.');
        router.push(projectorUrl);
      }
    }, 300);
  } catch (error) {
    console.error('Error preparing projector:', error);
    showToastMessage('Failed to open projector view');
  }
}

// Set up broadcast channel on component mount
onMounted(() => {
  setupBroadcastChannel();
});

// Clean up on unmount
onUnmounted(() => {
  if (broadcastChannel.value) {
    broadcastChannel.value.close();
  }
});

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

// Project settings methods
function toggleProjectSettings() {
  showProjectSettings.value = !showProjectSettings.value;
}

function handleProjectSettingsSaved() {
  showToastMessage('Project settings saved');
}

// Backup manager methods
function toggleBackupManager() {
  showBackupManager.value = !showBackupManager.value;
}

function closeBackupManager() {
  showBackupManager.value = false;
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

function toggleMask() {
  // TODO: Implement masking functionality
  console.log('Mask toggle - to be implemented');
}

function togglePreview() {
  showPreviewModal.value = !showPreviewModal.value;
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
  white-space: nowrap;
}

.back-to-dashboard {
  text-decoration: none;
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

.projector-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #2a2a2a;
}

.projector-button:hover {
  background-color: #3a3a3a;
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

.preview-content {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 20px;
}

.preview-canvas {
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
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

/* Project Settings Modal styles */
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
  max-width: 600px;
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

.close-btn {
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

.close-btn:hover {
  color: #fff;
  background-color: #e53935;
}

.modal-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section h4 {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 12px;
  color: #E0E0E0;
  border-bottom: 1px solid #333;
  padding-bottom: 8px;
}

.setting-item {
  display: flex;
  margin-bottom: 12px;
  align-items: center;
}

.setting-item label {
  width: 120px;
  font-size: 14px;
  color: #aaa;
}

.setting-item input[type="text"],
.setting-item input[type="number"],
.setting-item select {
  flex: 1;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 8px 12px;
  color: #E0E0E0;
  font-size: 14px;
}

.setting-item textarea {
  flex: 1;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 8px 12px;
  color: #E0E0E0;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
  background-color: #222;
  border-top: 1px solid #333;
}

.cancel-btn {
  padding: 8px 16px;
  background-color: #333;
  color: #E0E0E0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-btn:hover {
  background-color: #444;
}

.save-btn {
  padding: 8px 16px;
  background-color: #12B0FF;
  color: #000;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.save-btn:hover {
  background-color: #4acbff;
}

/* Collaboration Status Indicator */
.collaboration-status {
  margin-left: 12px;
}

.collab-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.collab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #6b7280;
  animation: pulse 2s infinite;
}

.collab-indicator.connected .collab-dot {
  background-color: #10b981;
}

.collab-indicator.connecting .collab-dot {
  background-color: #f59e0b;
}

.collab-indicator.disconnected .collab-dot {
  background-color: #ef4444;
}

.collab-text {
  color: #d1d5db;
  font-size: 11px;
}

.collab-indicator.connected .collab-text {
  color: #10b981;
}

.collab-indicator.connecting .collab-text {
  color: #f59e0b;
}

.collab-indicator.disconnected .collab-text {
  color: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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