<template>
  <div class="properties-panel" :class="{ 'collapsed': isCollapsed }">
    <div class="panel-header">
      <div class="header-left">
        <h3>Properties</h3>
        <button class="collapse-button" @click="toggleCollapse">
          <ChevronUp v-if="!isCollapsed" :size="16" />
          <ChevronDown v-else :size="16" />
        </button>
      </div>
      <button 
        v-if="selectedLayer" 
        class="close-button"
        @click="clearSelection"
      >
        <X :size="16" />
      </button>
    </div>

    <div v-if="selectedLayer && !isCollapsed" class="panel-content">
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
            @change="updateName" 
          />
        </div>

        <!-- Transform properties -->
        <div class="property">
          <label>Position</label>
          <div class="input-group">
            <input type="number" v-model="posX" placeholder="X" @change="updatePosition" @input="updatePreviewPosition"/>
            <input type="number" v-model="posY" placeholder="Y" @change="updatePosition" @input="updatePreviewPosition"/>
          </div>
        </div>

        <div class="property">
          <label>Scale</label>
          <div class="input-group">
            <input type="number" v-model="scaleX" placeholder="X" step="0.1" @change="updateScale" @input="updatePreviewScale"/>
            <input type="number" v-model="scaleY" placeholder="Y" step="0.1" @change="updateScale" @input="updatePreviewScale"/>
          </div>
        </div>

        <div class="property">
          <label>Rotation</label>
          <input type="number" v-model="rotation" @change="updateRotation" @input="updatePreviewRotation"/>
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
            @input="updatePreviewOpacity"
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

    <div v-else-if="!isCollapsed" class="panel-content empty">
      <p>Select a layer to edit its properties</p>
    </div>

    <!-- Toast notification -->
    <div v-if="showToast" class="toast">
      {{ toastMessage }}
    </div>

    <!-- Use the AssetsModal component -->
    <AssetsModal 
      v-model="showAssetsModal"
      :title="'Select Asset'"
      :assetTypeFilter="assetTypeFilter"
      @select-asset="handleAssetSelected"
      @toast="showToastMessage"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useLayersStore } from '../store/layers';
import { useHistoryStore } from '../store/history';
import { commandFactory } from '../utils/commandFactory';
import { X, Code, Upload, ChevronUp, ChevronDown } from 'lucide-vue-next';
import AssetsModal from './AssetsModal.vue';

const emit = defineEmits(['requestEdit']);

const layersStore = useLayersStore();
const historyStore = useHistoryStore();
const { selectedLayer } = storeToRefs(layersStore);
const { LayerTypes, BlendModes, updateLayer, clearSelection } = layersStore;

// Input values for properties (to avoid direct binding)
const posX = ref(0);
const posY = ref(0);
const scaleX = ref(1);
const scaleY = ref(1);
const rotation = ref(0);
const opacity = ref(1);
const blendMode = ref('normal');
const visible = ref(true);
const isCollapsed = ref(false);

// Add toast notification state
const showToast = ref(false);
const toastMessage = ref('');

// Assets modal state
const showAssetsModal = ref(false);
const assetTypeFilter = ref(null);

// Toggle panel collapse
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}

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
}, { immediate: true, deep: true });

// Add additional watch for layer properties to keep form inputs in sync
watch(() => [
  selectedLayer.value?.x,
  selectedLayer.value?.y,
  selectedLayer.value?.scale?.x,
  selectedLayer.value?.scale?.y,
  selectedLayer.value?.rotation,
  selectedLayer.value?.opacity,
  selectedLayer.value?.blendMode,
  selectedLayer.value?.visible
], ([x, y, scaleXVal, scaleYVal, rot, op, blend, vis]) => {
  if (selectedLayer.value) {
    posX.value = x;
    posY.value = y;
    scaleX.value = scaleXVal || 1;
    scaleY.value = scaleYVal || 1;
    rotation.value = rot || 0;
    opacity.value = op;
    blendMode.value = blend || 'normal';
    visible.value = vis;
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
}

function handleAssetSelected(asset) {
  if (!selectedLayer.value) return;
  
  const layer = selectedLayer.value;
  const originalState = { content: { ...layer.content } };
  const updates = { content: { ...layer.content, src: asset.url || asset.data } };
  
  historyStore.pushCommand(
    commandFactory.updateLayer(layer.id, updates, originalState)
  );
  
  showToastMessage(`Asset applied to layer`);
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

// Preview functions for immediate UI update
function updatePreviewPosition() {
  if (!selectedLayer.value) return;
  
  // Update the UI immediately for responsive feel
  if (selectedLayer.value) {
    selectedLayer.value.x = parseFloat(posX.value) || 0;
    selectedLayer.value.y = parseFloat(posY.value) || 0;
  }
}

function updatePreviewScale() {
  if (!selectedLayer.value) return;
  
  // Update the UI immediately for responsive feel
  if (selectedLayer.value) {
    if (!selectedLayer.value.scale) selectedLayer.value.scale = { x: 1, y: 1 };
    selectedLayer.value.scale.x = parseFloat(scaleX.value) || 1;
    selectedLayer.value.scale.y = parseFloat(scaleY.value) || 1;
  }
}

function updatePreviewRotation() {
  if (!selectedLayer.value) return;
  
  // Update the UI immediately for responsive feel
  if (selectedLayer.value) {
    selectedLayer.value.rotation = parseFloat(rotation.value) || 0;
  }
}

function updatePreviewOpacity() {
  if (!selectedLayer.value) return;
  
  // Update the UI immediately for responsive feel
  if (selectedLayer.value) {
    selectedLayer.value.opacity = parseFloat(opacity.value);
  }
}

// Update layer name
function updateName() {
  if (!selectedLayer.value) return;
  
  const originalState = { name: selectedLayer.value.name };
  const updates = { name: selectedLayer.value.name };
  
  historyStore.pushCommand(
    commandFactory.updateLayer(selectedLayer.value.id, updates, originalState)
  );
}

// Open code editor (emits event to parent)
function openCodeEditor() {
  if (!selectedLayer.value) return;
  
  emit('requestEdit', selectedLayer.value);
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
  color: #e0e0e0;
  transition: transform 0.3s ease;
  transform-origin: top center;
}

.properties-panel.collapsed {
  transform: translateY(calc(-100% + 46px)); /* Move up but leave header visible */
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-header h3 {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  color: #e0e0e0;
}

.close-button,
.collapse-button {
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

.close-button:hover,
.collapse-button:hover {
  color: #e0e0e0;
}

.panel-content {
  padding: 12px 16px;
  max-height: 600px;
  overflow-y: auto;
}

.panel-content.empty {
  text-align: center;
  padding: 24px 16px;
  color: #888;
}

.section {
  margin-bottom: 20px;
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
  margin: 0;
}

.property {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
}

.property:last-child {
  margin-bottom: 0;
}

.property label {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 6px;
}

.property input[type="text"],
.property input[type="number"],
.property select {
  width: 100%;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 6px 8px;
  color: #e0e0e0;
  font-size: 14px;
}

.input-group {
  display: flex;
  gap: 8px;
}

.input-group input {
  flex: 1;
}

.visibility-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
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

.file-select-button,
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

.file-select-button:hover,
.code-button:hover {
  background-color: #4acbff;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

input[type="range"] {
  width: 80%;
  -webkit-appearance: none;
  height: 4px;
  background: #444;
  border-radius: 2px;
  outline: none;
  margin-right: 8px;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #12B0FF;
  cursor: pointer;
}

/* Toast notification styles */
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: #e0e0e0;
  padding: 12px 20px;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}
</style>