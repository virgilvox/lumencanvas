<template>
  <div class="assets-panel">
    <div class="panel-header">
      <h3>Assets</h3>
      <button @click="openFileModal" class="file-modal-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <span>Open File Browser</span>
      </button>
    </div>
    
    <div class="assets-list">
      <div v-if="loading" class="loading-state">
        <p>Loading assets...</p>
      </div>
      
      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button @click="projectStore.loadProject(projectStore.projectId)">Retry</button>
      </div>
      
      <div v-else-if="assets.length === 0" class="empty-state">
        No assets yet. Click "Open File Browser" to add files.
      </div>
      
      <div 
        v-else v-for="asset in assets" 
        :key="asset.id" 
        class="asset-item"
        :class="{ active: selectedAsset && selectedAsset.id === asset.id }"
        @click="selectAsset(asset)"
      >
        <div class="asset-preview">
          <img v-if="asset.type === 'image'" :src="asset.url" :alt="asset.name" crossorigin="anonymous" />
          <div v-else-if="asset.type === 'video'" class="video-preview">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
          <div v-else class="generic-preview">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
        </div>
        
        <div class="asset-info">
          <div class="asset-name">{{ asset.name }}</div>
          <div class="asset-type">{{ asset.type }}</div>
        </div>
        
        <div class="asset-actions">
          <button @click.stop="useAsset(asset)" class="action-btn" title="Use Asset">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <button @click.stop="handleAssetDeletion(asset.id)" class="action-btn" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="preview-section">
      <div v-if="selectedAsset" class="preview-content">
        <div class="preview-box">
          <img v-if="selectedAsset.type === 'image'" :src="selectedAsset.url" :alt="selectedAsset.name" class="preview-media" crossorigin="anonymous" />
          <video v-else-if="selectedAsset.type === 'video'" :src="selectedAsset.url" controls muted loop autoplay class="preview-media"></video>
          <div v-else class="generic-preview-large">
            <span>No Preview Available</span>
          </div>
        </div>
        <div class="preview-details">
          <p class="preview-name" :title="selectedAsset.name">{{ selectedAsset.name }}</p>
          <p class="preview-type">{{ selectedAsset.type }}</p>
        </div>
      </div>
      <div v-else class="preview-empty">
        <p>Select an asset to preview</p>
      </div>
    </div>
    
    <!-- Use the AssetsModal component -->
    <AssetsModal 
      v-model="showFileModal"
      title="File Browser"
      @select-asset="handleAssetSelected"
      @toast="showToastMessage"
    />
    
    <!-- Toast notification -->
    <div v-if="showToast" class="toast">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useLayersStore } from '../store/layers';
import { useProjectStore } from '../store/project';
import AssetsModal from './AssetsModal.vue';
import { storeToRefs } from 'pinia';

// State
const showFileModal = ref(false);
const showToast = ref(false);
const toastMessage = ref('');
const selectedAssetId = ref(null);

// Store access
const projectStore = useProjectStore();
const layersStore = useLayersStore();
const { assets, isLoading: loading, error } = storeToRefs(projectStore);

const selectedAsset = computed(() => {
  return assets.value.find(a => a.id === selectedAssetId.value) || null;
});

// Methods
function openFileModal() {
  projectStore.setFilePickerActive(true);
  showFileModal.value = true;
}

function selectAsset(asset) {
  selectedAssetId.value = asset.id;
}

function handleAssetSelected(asset) {
  // This function might be used if selecting an asset from the panel
  // has a different behavior than using it directly.
  // For now, it mainly adds the asset to the project.
  projectStore.addAsset(asset);
  showToastMessage(`Asset ${asset.name} is available in the project`);
}

function useAsset(asset) {
  // Create a new layer with this asset
  let layerType;
  
  switch (asset.type) {
    case 'image':
      layerType = layersStore.LayerTypes.IMAGE;
      break;
    case 'video':
      layerType = layersStore.LayerTypes.VIDEO;
      break;
    default:
      showToastMessage(`Unsupported asset type: ${asset.type}`);
      return;
  }
  
  // Create a new layer with this asset
  layersStore.addLayer(layerType, {
    src: asset.url
  });
  
  showToastMessage(`Created new ${asset.type} layer from: ${asset.name}`);
}

async function handleAssetDeletion(assetId) {
    if (confirm('Are you sure you want to delete this asset? This cannot be undone.')) {
        await projectStore.deleteAsset(assetId);
        showToastMessage('Asset deleted');
    }
}

// Show a toast message
function showToastMessage(message, duration = 3000) {
  toastMessage.value = message;
  showToast.value = true;
  
  setTimeout(() => {
    showToast.value = false;
  }, duration);
}
</script>

<style scoped>
.assets-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.file-modal-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background-color: #12B0FF;
  color: #000;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-modal-btn:hover {
  background-color: #4acbff;
}

.assets-list {
  flex-grow: 1;
  overflow-y: auto;
  padding: 12px;
}

.asset-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  background-color: #1a1a1a;
  transition: background-color 0.2s;
  cursor: pointer;
}

.asset-item.active {
  background-color: #2a2a2a;
  outline: 1px solid var(--accent);
}

.asset-item:hover {
  background-color: #2a2a2a;
}

.asset-preview {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #333;
  flex-shrink: 0;
}

.asset-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-preview, .generic-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
}

.asset-info {
  flex: 1;
  min-width: 0;
}

.asset-name {
  font-size: 14px;
  font-weight: 500;
  color: #E0E0E0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-type {
  font-size: 12px;
  color: #888;
  text-transform: capitalize;
}

.asset-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  color: #E0E0E0;
  background-color: #333;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 24px;
  font-size: 14px;
}

.loading-state, .error-state {
  text-align: center;
  color: #666;
  padding: 24px;
}

.error-state button {
  margin-top: 16px;
  padding: 8px 16px;
  background-color: #333;
  border: none;
  border-radius: 4px;
  color: #E0E0E0;
  cursor: pointer;
}

.error-state button:hover {
  background-color: #444;
}

/* Preview Section */
.preview-section {
  flex-shrink: 0;
  padding: 12px;
  border-top: 1px solid #333;
  background-color: #1a1a1a;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-box {
  width: 100%;
  height: 150px;
  background-color: #111;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.generic-preview-large {
  color: #666;
  font-size: 14px;
}

.preview-details {
  text-align: center;
}

.preview-name {
  font-size: 14px;
  color: #E0E0E0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.preview-type {
  font-size: 12px;
  color: #888;
  text-transform: capitalize;
  margin: 0;
}

.preview-empty {
  height: 198px; /* Match height of content */
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 14px;
}

/* Toast notification */
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: #E0E0E0;
  padding: 12px 20px;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}
</style> 