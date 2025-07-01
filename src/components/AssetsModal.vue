<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click="close">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h3>{{ title }}</h3>
            <button @click="close" class="close-btn">
              <X :size="16" />
            </button>
          </div>
          
          <div class="modal-content">
            <div class="assets-browser">
              <!-- Tabs for navigation -->
              <div class="assets-tabs">
                <button 
                  class="assets-tab"
                  :class="{ active: assetsTab === 'project' }"
                  @click="assetsTab = 'project'"
                >
                  Project Assets
                </button>
                <button 
                  class="assets-tab"
                  :class="{ active: assetsTab === 'upload' }"
                  @click="assetsTab = 'upload'"
                >
                  Upload New
                </button>
              </div>
              
              <!-- Project Assets Tab -->
              <div v-if="assetsTab === 'project'" class="assets-list">
                <div v-if="loading" class="loading-state">
                  Loading assets...
                </div>
                
                <div v-else-if="projectAssets.length === 0" class="empty-state">
                  No assets yet. Upload some files first.
                </div>
                
                <div 
                  v-else
                  v-for="asset in filteredAssets" 
                  :key="asset.id" 
                  class="asset-item"
                  :class="{ selected: selectedAssetId === asset.id }"
                  @click="selectAsset(asset)"
                >
                  <div class="asset-preview">
                    <img v-if="asset.type === 'image'" :src="asset.url || asset.data" alt="Asset preview" />
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
                </div>
              </div>
              
              <!-- Upload Tab -->
              <div v-if="assetsTab === 'upload'" class="upload-area">
                <!-- VueFinder Component -->
                <div v-if="assetsTab === 'upload'" class="vuefinder-container">
                  <VueFinder 
                    :request="requestCfg"
                    @select="handleVueFinderSelect"
                    @uploaded="handleVueFinderUploaded"
                    @error="handleVueFinderError"
                  />
                </div>
                
                <!-- Fallback upload (shown only if VueFinder fails to load) -->
                <div v-if="vuefinderError" class="upload-zone">
                  <div class="upload-content">
                    <Upload :size="32" />
                    <p>VueFinder failed to load - using local upload</p>
                  </div>
                  <input 
                    type="file" 
                    :accept="acceptedFileTypes" 
                    @change="handleFileUpload"
                    class="file-input"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button @click="close" class="cancel-btn">Cancel</button>
            <button 
              @click="useSelectedAsset" 
              class="select-btn"
              :disabled="!selectedAssetId"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { X, Upload } from 'lucide-vue-next';
import { useStorageService } from '../services/storage';
import axios from 'axios'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Select Asset'
  },
  assetTypeFilter: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'select-asset', 'toast']);

// State
const assetsTab = ref('project');
const projectAssets = ref([]);
const selectedAssetId = ref(null);
const loading = ref(false);
const vuefinderError = ref(false);

// Services
const { saveAsset, getProjectAssets, getAllAssets } = useStorageService();

const requestCfg = {
  baseUrl: '/api/vf',      // must exist
  headers: { /* optional */ },
  params : { adapter: 'netlify' },   // if you still want ?adapter=
  // use transformRequest if you need to force POST
  transformRequest: (cfg) => {
    // Vuefinder sets cfg.method = 'get' for list/index
    if (cfg.method === 'get') {
      cfg.method = 'post'
      cfg.data   = { action: cfg.params.q, ...cfg.params }
      delete cfg.params
    }
    return cfg
  }
}


// Computed
const filteredAssets = computed(() => {
  if (!props.assetTypeFilter) return projectAssets.value;
  return projectAssets.value.filter(asset => asset.type === props.assetTypeFilter);
});

const acceptedFileTypes = computed(() => {
  if (!props.assetTypeFilter) return '';
  
  if (props.assetTypeFilter === 'image') {
    return 'image/*';
  }
  
  if (props.assetTypeFilter === 'video') {
    return 'video/*';
  }
  
  return '';
});

// Methods
function close() {
  emit('update:modelValue', false);
}

function selectAsset(asset) {
  selectedAssetId.value = asset.id;
}

function useSelectedAsset() {
  if (!selectedAssetId.value) {
    close();
    return;
  }
  
  const asset = projectAssets.value.find(a => a.id === selectedAssetId.value);
  if (!asset) {
    close();
    return;
  }
  
  emit('select-asset', asset);
  close();
  showToastMessage(`Asset selected: ${asset.name}`);
}

async function loadProjectAssets() {
  loading.value = true;
  try {
    // For now, we'll get assets for the current project
    // In a real implementation, we would get the current project ID
    const projectId = 'current';
    const assets = await getProjectAssets(projectId);
    
    if (assets && Array.isArray(assets)) {
      projectAssets.value = assets;
    } else {
      projectAssets.value = [];
    }
  } catch (error) {
    console.error('Failed to load assets:', error);
    showToastMessage('Failed to load assets');
    projectAssets.value = [];
  } finally {
    loading.value = false;
  }
}

// VueFinder event handlers
function handleVueFinderSelect(files) {
  console.log('VueFinder select event:', files);
  // Handle file selection if needed
}

function handleVueFinderUploaded(response) {
  console.log('VueFinder uploaded event:', response);
  showToastMessage('File uploaded successfully');
  // Reload project assets to show new uploads
  loadProjectAssets();
}

function handleVueFinderError(error) {
  console.error('VueFinder error:', error);
  vuefinderError.value = true;
  showToastMessage(`Error: ${error.message || error}`, 'error');
}

// Handle file upload
async function handleFileUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  try {
    for (const file of files) {
      const fileType = file.type.split('/')[0]; // 'image', 'video', etc.
      
      // Create a URL for the file
      const url = URL.createObjectURL(file);
      
      // Create an asset object
      const asset = {
        id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: fileType,
        url,
        file,
        projectId: 'current' // This would be the actual project ID in a real implementation
      };
      
      // Add to assets list
      projectAssets.value.push(asset);
      
      // Save to storage
      await saveAsset(asset);
    }
    
    showToastMessage('Files uploaded successfully');
    
    // Switch to project tab to show the new asset
    assetsTab.value = 'project';
  } catch (error) {
    console.error('Failed to upload files:', error);
    showToastMessage('Failed to upload files');
  }
  
  // Reset the file input
  event.target.value = '';
}

function getFileType(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const videoExts = ['mp4', 'webm', 'ogg', 'mov'];
  
  if (imageExts.includes(extension)) return 'image';
  if (videoExts.includes(extension)) return 'video';
  
  return 'other';
}

// Show a toast message
function showToastMessage(message) {
  emit('toast', message);
}

// Load assets on component mount
onMounted(() => {
  loadProjectAssets();
});
</script>

<style scoped>
/* Modal styles */
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
  max-width: 800px;
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
  color: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-btn:hover {
  background-color: #444;
}

.select-btn {
  padding: 8px 16px;
  background-color: #12B0FF;
  color: #000;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.select-btn:hover:not(:disabled) {
  background-color: #4acbff;
}

.select-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Assets browser styles */
.assets-browser {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.assets-tabs {
  display: flex;
  border-bottom: 1px solid #333;
  margin-bottom: 16px;
}

.assets-tab {
  padding: 8px 16px;
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.assets-tab:hover {
  color: #e0e0e0;
}

.assets-tab.active {
  color: #e0e0e0;
  border-bottom-color: #12B0FF;
}

.assets-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  padding: 8px;
}

.asset-item {
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  overflow: hidden;
  background-color: #222;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.asset-item:hover {
  background-color: #2a2a2a;
}

.asset-item.selected {
  border-color: #12B0FF;
}

.asset-preview {
  height: 100px;
  background-color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.asset-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-preview,
.generic-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
}

.asset-info {
  padding: 8px;
}

.asset-name {
  font-size: 12px;
  font-weight: 500;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-type {
  font-size: 11px;
  color: #888;
  text-transform: capitalize;
}

.upload-area {
  flex: 1;
  padding: 16px;
}

.upload-zone {
  width: 100%;
  height: 200px;
  border: 2px dashed #444;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.upload-zone:hover {
  border-color: #12B0FF;
  background-color: rgba(18, 176, 255, 0.05);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #888;
}

.upload-content p {
  margin: 8px 0 0;
}

.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.empty-state {
  grid-column: 1 / -1;
  padding: 32px;
  text-align: center;
  color: #666;
}

.loading-state {
  grid-column: 1 / -1;
  padding: 32px;
  text-align: center;
  color: #888;
}

/* VueFinder container */
.vuefinder-container {
  height: 450px;
  border: 1px solid #333;
  background-color: #1a1a1a;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 10px;
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
