<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click="close">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h3>{{ title }}</h3>
            <button @click="close" class="close-btn" title="Close">
              <X :size="16" />
            </button>
          </div>
          
          <div class="modal-content">
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
              <div v-if="loading" class="loading-state">Loading...</div>
              <div v-else-if="filteredAssets.length === 0" class="empty-state">
                No {{ assetTypeFilter }} assets found.
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
                  <img v-if="asset.type === 'image'" :src="asset.url" alt="Asset preview" />
                  <div v-else class="generic-preview">...</div>
                </div>
                <div class="asset-info">{{ asset.name }}</div>
              </div>
            </div>

            <!-- Upload Tab -->
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
              <div v-if="uploading" class="upload-progress">
                Uploading...
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button @click="close" class="cancel-btn">Cancel</button>
            <button 
              @click="useSelectedAsset" 
              class="select-btn"
              :disabled="!selectedAssetId || assetsTab !== 'project'"
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
import { ref, computed, watch } from 'vue';
import { X, Upload } from 'lucide-vue-next';
import api from '../services/api';
import { useProjectStore } from '../store/project';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Select Asset' },
  assetTypeFilter: { type: String, default: null } // 'image', 'video', etc.
});

const emit = defineEmits(['update:modelValue', 'select-asset', 'toast']);

const projectStore = useProjectStore();
const assetsTab = ref('project');
const projectAssets = ref([]);
const selectedAssetId = ref(null);
const loading = ref(false);
const uploading = ref(false);

const acceptedFileTypes = computed(() => {
  if (props.assetTypeFilter === 'image') return 'image/*';
  if (props.assetTypeFilter === 'video') return 'video/*';
  return '*/*';
});

const filteredAssets = computed(() => {
  if (!props.assetTypeFilter) return projectAssets.value;
  return projectAssets.value.filter(asset => asset.type === props.assetTypeFilter);
});

async function loadProjectAssets() {
  if (!projectStore.projectId) return;
  loading.value = true;
  try {
    // This assumes project data in the store contains the assets list
    projectAssets.value = projectStore.projectData.assets || [];
  } catch (error) {
    console.error('Failed to load project assets:', error);
    emit('toast', 'Failed to load assets');
  } finally {
    loading.value = false;
  }
}

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file || !projectStore.projectId) return;

  uploading.value = true;
  try {
    const { uploadUrl, publicUrl, assetId, key } = await api.assets.getUploadUrl(
      file.name,
      file.type,
      projectStore.projectId
    );

    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    // After successful upload, make the file public
    await api.assets.setPublic(key);

    const newAsset = {
      id: assetId,
      name: file.name,
      type: file.type.split('/')[0],
      url: publicUrl,
      key: key
    };
    
    // Add asset to project store
    projectStore.addAsset(newAsset);
    
    emit('toast', `File uploaded: ${file.name}`);
    await loadProjectAssets(); // Refresh asset list
    assetsTab.value = 'project'; // Switch to project assets
    selectAsset(newAsset); // Auto-select the new asset

  } catch (error) {
    console.error('Upload failed:', error);
    emit('toast', `Upload failed: ${error.message}`);
  } finally {
    uploading.value = false;
  }
}

function selectAsset(asset) {
  selectedAssetId.value = asset.id;
}

function useSelectedAsset() {
  const asset = projectAssets.value.find(a => a.id === selectedAssetId.value);
  if (asset) {
    emit('select-asset', asset);
    close();
  }
}

function close() {
  emit('update:modelValue', false);
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    assetsTab.value = 'project';
    selectedAssetId.value = null;
    loadProjectAssets();
  }
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
  min-height: 300px;
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

.upload-progress {
  margin-top: 16px;
  text-align: center;
  color: #12B0FF;
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
