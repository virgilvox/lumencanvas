<template>
  <div class="properties-panel">
    <div class="panel-header">
      <h3>Properties</h3>
      <button 
        v-if="selectedLayer" 
        class="close-button"
        @click="clearSelection"
      >
        <X :size="16" />
      </button>
    </div>

    <div v-if="selectedLayer" class="panel-content">
      <div class="section">
        <div class="section-header">
          <h4>{{ layerTypeDisplay }} Layer</h4>
          <div class="visibility-toggle">
            <input 
              type="checkbox" 
              :checked="selectedLayer.visible" 
              @change="toggleVisibility" 
            />
            <span>Visible</span>
          </div>
        </div>

        <!-- Layer name -->
        <div class="property">
          <label>Name</label>
          <input 
            type="text" 
            v-model="selectedLayer.name" 
            @change="historyStore.pushCommand(commandFactory.updateLayer(selectedLayer.id, { name: selectedLayer.name }, { name: selectedLayer.name }))" 
          />
        </div>

        <!-- Transform properties -->
        <div class="property">
          <label>Position</label>
          <div class="input-group">
            <input type="number" v-model="posX" placeholder="X" @change="updatePosition"/>
            <input type="number" v-model="posY" placeholder="Y" @change="updatePosition"/>
          </div>
        </div>

        <div class="property">
          <label>Scale</label>
          <div class="input-group">
            <input type="number" v-model="scaleX" placeholder="X" step="0.1" @change="updateScale"/>
            <input type="number" v-model="scaleY" placeholder="Y" step="0.1" @change="updateScale"/>
          </div>
        </div>

        <div class="property">
          <label>Rotation</label>
          <input type="number" v-model="rotation" @change="updateRotation"/>
        </div>

        <!-- Appearance properties -->
        <div class="property">
          <label>Opacity</label>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            v-model="opacity" 
            @change="updateOpacity"
          />
          <span>{{ Math.round(opacity * 100) }}%</span>
        </div>

        <div class="property">
          <label>Blend Mode</label>
          <select v-model="blendMode" @change="updateBlendMode(blendMode)">
            <option value="normal">Normal</option>
            <option value="add">Add</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
          </select>
        </div>

        <!-- Layer-specific properties -->
        <div v-if="selectedLayer.type === 'image'" class="property">
          <label>Image</label>
          <div v-if="hasPreview" class="preview-container">
            <img :src="previewSrc" class="preview-image" />
          </div>
          <button class="file-select-button" @click="openAssetsModal('image')">
            <Upload :size="16" />
            <span>Select from Assets</span>
          </button>
        </div>

        <div v-if="selectedLayer.type === 'video'" class="property">
          <label>Video</label>
          <div v-if="hasPreview" class="preview-container">
            <video :src="previewSrc" class="preview-video" controls muted loop />
          </div>
          <button class="file-select-button" @click="openAssetsModal('video')">
            <Upload :size="16" />
            <span>Select from Assets</span>
          </button>
        </div>

        <div v-if="selectedLayer.type === 'shader'" class="property">
          <label>Shader</label>
          <button class="code-button" @click="openCodeEditor">
            <Code :size="16" />
            <span>Edit Shader Code</span>
          </button>
        </div>

        <div v-if="selectedLayer.type === 'html'" class="property">
          <label>HTML Content</label>
          <button class="code-button" @click="openCodeEditor">
            <Code :size="16" />
            <span>Edit HTML</span>
          </button>
        </div>

        <div v-if="selectedLayer.type === 'url'" class="property">
          <label>URL</label>
          <input 
            type="text" 
            v-model="selectedLayer.content.url" 
            @change="updateUrl(selectedLayer.content.url)" 
          />
        </div>

        <!-- Warp controls -->
        <div class="property">
          <label>Warp</label>
          <div class="checkbox-group">
            <input 
              type="checkbox" 
              :checked="selectedLayer.warp?.enabled" 
              @change="historyStore.pushCommand(commandFactory.updateLayer(selectedLayer.id, { warp: { ...selectedLayer.warp, enabled: !selectedLayer.warp?.enabled } }, { warp: { ...selectedLayer.warp } }))" 
            />
            <span>Enable Warping</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="panel-content empty">
      <p>Select a layer to edit its properties</p>
    </div>

    <!-- Toast notification -->
    <div v-if="showToast" class="toast">
      {{ toastMessage }}
    </div>

    <!-- Add Assets Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAssetsModal" class="modal-overlay" @click="closeAssetsModal">
          <div class="modal-container" @click.stop>
            <div class="modal-header">
              <h3>Select Asset</h3>
              <button @click="closeAssetsModal" class="close-btn">
                <X :size="16" />
              </button>
            </div>
            
            <div class="modal-content">
              <div class="assets-browser">
                <!-- Here we would integrate VueFinder or a custom file browser -->
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
                
                <div v-if="assetsTab === 'upload'" class="upload-area">
                  <label class="upload-zone">
                    <div class="upload-content">
                      <Upload :size="32" />
                      <p>Drop files here or click to upload</p>
                    </div>
                    <input 
                      type="file" 
                      :accept="acceptedFileTypes" 
                      @change="handleFileUpload"
                      class="file-input"
                    />
                  </label>
                </div>
              </div>
            </div>
            
            <div class="modal-footer">
              <button @click="closeAssetsModal" class="cancel-btn">Cancel</button>
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
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useLayersStore } from '../store/layers';
import { useHistoryStore } from '../store/history';
import { commandFactory } from '../utils/commandFactory';
import { useStorageService } from '../services/storage';
import { X, Code, Upload } from 'lucide-vue-next';

const emit = defineEmits(['requestEdit']);

const layersStore = useLayersStore();
const historyStore = useHistoryStore();
const { selectedLayer } = storeToRefs(layersStore);
const { LayerTypes, BlendModes, updateLayer, clearSelection } = layersStore;
const { getProjectAssets, saveAsset } = useStorageService();

// Input values for properties (to avoid direct binding)
const posX = ref(0);
const posY = ref(0);
const scaleX = ref(1);
const scaleY = ref(1);
const rotation = ref(0);
const opacity = ref(1);
const blendMode = ref('normal');
const visible = ref(true);

// Add toast notification state
const showToast = ref(false);
const toastMessage = ref('');

// Assets modal state
const showAssetsModal = ref(false);
const assetsTab = ref('project');
const projectAssets = ref([]);
const selectedAssetId = ref(null);
const assetTypeFilter = ref(null);
const loading = ref(false);

// Update input values when selected layer changes
watch(selectedLayer, (layer) => {
  if (layer) {
    posX.value = layer.x;
    posY.value = layer.y;
    scaleX.value = layer.scale?.x || 1;
    scaleY.value = layer.scale?.y || 1;
    rotation.value = layer.rotation || 0;
    opacity.value = layer.opacity;
    blendMode.value = layer.blendMode || 'normal';
    visible.value = layer.visible;
  }
}, { immediate: true });

// Handle position change
function updatePosition() {
  if (!selectedLayer.value) return;
  
  const layer = selectedLayer.value;
  const originalState = { x: layer.x, y: layer.y };
  const updates = { x: parseFloat(posX.value), y: parseFloat(posY.value) };
  
  historyStore.pushCommand(
    commandFactory.updateLayer(layer.id, updates, originalState)
  );
}

// Handle scale change
function updateScale() {
  if (!selectedLayer.value) return;
  
  const layer = selectedLayer.value;
  const originalState = { scale: { x: layer.scale?.x || 1, y: layer.scale?.y || 1 } };
  const updates = { scale: { x: parseFloat(scaleX.value), y: parseFloat(scaleY.value) } };
  
  historyStore.pushCommand(
    commandFactory.updateLayer(layer.id, updates, originalState)
  );
}

// Handle rotation change
function updateRotation() {
  if (!selectedLayer.value) return;
  
  const layer = selectedLayer.value;
  const originalState = { rotation: layer.rotation || 0 };
  const updates = { rotation: parseFloat(rotation.value) };
  
  historyStore.pushCommand(
    commandFactory.updateLayer(layer.id, updates, originalState)
  );
}

// Handle opacity change
function updateOpacity() {
  if (!selectedLayer.value) return;
  
  const layer = selectedLayer.value;
  const originalState = { opacity: layer.opacity };
  const updates = { opacity: parseFloat(opacity.value) };
  
  historyStore.pushCommand(
    commandFactory.updateLayer(layer.id, updates, originalState)
  );
}

// Handle blend mode change
function updateBlendMode(mode) {
  if (!selectedLayer.value) return;
  
  const layer = selectedLayer.value;
  const originalState = { blendMode: layer.blendMode };
  const updates = { blendMode: mode };
  
  historyStore.pushCommand(
    commandFactory.updateLayer(layer.id, updates, originalState)
  );
}

// Handle visibility toggle
function toggleVisibility() {
  if (!selectedLayer.value) return;
  
  const layer = selectedLayer.value;
  const originalState = { visible: layer.visible };
  const updates = { visible: !layer.visible };
  
  historyStore.pushCommand(
    commandFactory.updateLayer(layer.id, updates, originalState)
  );
}

// Show a toast message
function showToastMessage(message, duration = 3000) {
  toastMessage.value = message;
  showToast.value = true;
  
  setTimeout(() => {
    showToast.value = false;
  }, duration);
}

// Assets modal functions
function openAssetsModal(type) {
  showAssetsModal.value = true;
  assetTypeFilter.value = type;
  assetsTab.value = 'project';
  selectedAssetId.value = null;
  loadProjectAssets();
}

function closeAssetsModal() {
  showAssetsModal.value = false;
  selectedAssetId.value = null;
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

function selectAsset(asset) {
  selectedAssetId.value = asset.id;
}

function useSelectedAsset() {
  if (!selectedAssetId.value || !selectedLayer.value) {
    closeAssetsModal();
    return;
  }
  
  const asset = projectAssets.value.find(a => a.id === selectedAssetId.value);
  if (!asset) {
    closeAssetsModal();
    return;
  }
  
  const layer = selectedLayer.value;
  const originalState = { content: { ...layer.content } };
  const updates = { content: { ...layer.content, src: asset.url || asset.data } };
  
  historyStore.pushCommand(
    commandFactory.updateLayer(layer.id, updates, originalState)
  );
  
  closeAssetsModal();
  showToastMessage(`Asset applied to layer`);
}

// Handle file upload for image/video layers
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
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
    
    // Save to storage
    await saveAsset(asset);
    
    // Add to assets list and select it
    projectAssets.value.push(asset);
    selectedAssetId.value = asset.id;
    
    // Switch to project tab to show the new asset
    assetsTab.value = 'project';
    
    showToastMessage('File uploaded successfully');
  } catch (error) {
    console.error('Failed to upload file:', error);
    showToastMessage('Failed to upload file');
  }
  
  // Reset the file input
  event.target.value = '';
}

// Handle shader code update
function updateShaderCode(code) {
  if (!selectedLayer.value || selectedLayer.value.type !== 'shader') return;
  
  const layer = selectedLayer.value;
  const originalState = { content: { ...layer.content } };
  const updates = { content: { ...layer.content, fragmentShader: code } };
  
  historyStore.pushCommand(
    commandFactory.updateLayer(layer.id, updates, originalState)
  );
}

// Handle HTML content update
function updateHtmlContent(content) {
  if (!selectedLayer.value || selectedLayer.value.type !== 'html') return;
  
  const layer = selectedLayer.value;
  const originalState = { content: { ...layer.content } };
  const updates = { content: { ...layer.content, html: content } };
  
  historyStore.pushCommand(
    commandFactory.updateLayer(layer.id, updates, originalState)
  );
}

// Handle URL update
function updateUrl(url) {
  if (!selectedLayer.value || selectedLayer.value.type !== 'url') return;
  
  const layer = selectedLayer.value;
  const originalState = { content: { ...layer.content } };
  const updates = { content: { ...layer.content, url } };
  
  historyStore.pushCommand(
    commandFactory.updateLayer(layer.id, updates, originalState)
  );
}

// Get the preview image source for the selected layer
const previewSrc = computed(() => {
  const layer = selectedLayer.value;
  if (!layer) return null;
  
  if (layer.type === 'image' && layer.content?.src) {
    return layer.content.src;
  }
  
  if (layer.type === 'video' && layer.content?.src) {
    return layer.content.src;
  }
  
  return null;
});

// Determine if the layer has a preview
const hasPreview = computed(() => {
  const layer = selectedLayer.value;
  return layer && (layer.type === 'image' || layer.type === 'video') && layer.content?.src;
});

// Filter assets based on the current type filter
const filteredAssets = computed(() => {
  if (!assetTypeFilter.value) return projectAssets.value;
  
  return projectAssets.value.filter(asset => asset.type === assetTypeFilter.value);
});

// Get the accepted file types for the current layer
const acceptedFileTypes = computed(() => {
  if (!assetTypeFilter.value) return '';
  
  if (assetTypeFilter.value === 'image') {
    return 'image/*';
  }
  
  if (assetTypeFilter.value === 'video') {
    return 'video/*';
  }
  
  return '';
});

// Determine if the layer is a shader
const isShaderLayer = computed(() => {
  const layer = selectedLayer.value;
  return layer && layer.type === 'shader';
});

// Determine if the layer is HTML
const isHtmlLayer = computed(() => {
  const layer = selectedLayer.value;
  return layer && layer.type === 'html';
});

// Determine if the layer is URL
const isUrlLayer = computed(() => {
  const layer = selectedLayer.value;
  return layer && layer.type === 'url';
});

// Open code editor for shader or HTML layers
function openCodeEditor() {
  if (!selectedLayer.value) return;
  
  const layer = selectedLayer.value;
  if (layer.type === 'shader' || layer.type === 'html') {
    window.dispatchEvent(new CustomEvent('open-code-editor', { detail: layer }));
  }
}

function updateProperties(props) {
  if (selectedLayer.value) {
    updateLayer(selectedLayer.value.id, {
      properties: { ...selectedLayer.value.properties, ...props }
    });
  }
}

function updateContent(content) {
  if (selectedLayer.value) {
    updateLayer(selectedLayer.value.id, {
      content: { ...selectedLayer.value.content, ...content }
    });
  }
}

// Get the layer type display name
const layerTypeDisplay = computed(() => {
  const layer = selectedLayer.value;
  if (!layer) return '';
  
  const typeMap = {
    'image': 'Image',
    'video': 'Video',
    'shader': 'Shader',
    'html': 'HTML',
    'url': 'URL',
  };
  
  return typeMap[layer.type] || layer.type;
});
</script>

<style scoped>
.properties-panel {
  position: absolute;
  right: 16px;
  top: 64px; /* Below top bar */
  width: 280px;
  background-color: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.panel-header h3 {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #E0E0E0;
}

.panel-content {
  padding: 12px 16px;
  max-height: 600px;
  overflow-y: auto;
}

.section {
  margin-bottom: 20px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h4 {
  font-size: 12px;
  font-weight: 500;
  color: #888;
  text-transform: uppercase;
}

.property {
  margin-bottom: 12px;
}

.property:last-child {
  margin-bottom: 0;
}

.property label {
  font-size: 14px;
  color: #aaa;
  width: 80px;
  flex-shrink: 0;
}

.property input[type="text"],
.property input[type="number"],
.property select {
  flex: 1;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 6px 8px;
  color: #E0E0E0;
  font-size: 14px;
}

.input-group {
  display: flex;
  gap: 8px;
  flex: 1;
}

.input-group input {
  width: calc(50% - 4px);
  flex: 1 1 50%;
}

.visibility-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.visibility-toggle input[type="checkbox"] {
  width: auto;
}

.preview-container {
  margin-bottom: 12px;
}

.preview-image,
.preview-video {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.file-select-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background-color: #12B0FF;
  color: #000;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-select-button:hover {
  background-color: #4acbff;
}

.code-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background-color: #12B0FF;
  color: #000;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.code-button:hover {
  background-color: #4acbff;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
}

.empty {
  text-align: center;
  padding: 12px;
}

/* Toast notification styles */
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

/* Assets Modal styles */
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
  color: #E0E0E0;
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
  color: #E0E0E0;
}

.assets-tab.active {
  color: #E0E0E0;
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
  color: #E0E0E0;
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
  display: none;
}

.empty-state {
  grid-column: 1 / -1;
  padding: 32px;
  text-align: center;
  color: #666;
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