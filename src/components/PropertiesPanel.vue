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
            @focus="captureOriginalState(['name'])"
            @change="updateName" 
          />
        </div>

        <!-- Transform properties -->
        <div class="property">
          <label>Position</label>
          <div class="input-group">
            <input type="number" v-model.lazy="posX" placeholder="X" @change="updatePosition"/>
            <input type="number" v-model.lazy="posY" placeholder="Y" @change="updatePosition"/>
          </div>
        </div>

        <div class="property">
          <label>Scale</label>
          <input type="number" v-model.lazy="scale" placeholder="Uniform Scale" step="0.1" @change="updateScale"/>
        </div>

        <div class="property">
          <label>Rotation</label>
          <input type="number" v-model.lazy="rotation" @change="updateRotation"/>
        </div>

        <!-- Appearance properties -->
        <div class="property">
          <label>Opacity</label>
          <div class="input-group-vertical">
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              v-model.lazy="opacity" 
              @change="updateOpacity"
            />
            <span>{{ Math.round(opacity * 100) }}%</span>
          </div>
        </div>

        <div class="property">
          <label>Blend Mode</label>
          <select v-model="blendMode" @focus="captureOriginalState(['blendMode'])" @change="updateBlendMode(blendMode)">
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
const scale = ref(1);
const rotation = ref(0);
const opacity = ref(1);
const blendMode = ref('normal');
const visible = ref(true);
const isCollapsed = ref(false);
const originalStateForUndo = ref({});

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

function captureOriginalState(properties) {
  if (!selectedLayer.value) return;
  originalStateForUndo.value = {}; // Clear previous state
  properties.forEach(prop => {
    const layer = selectedLayer.value;
    if (layer && typeof layer[prop] !== 'undefined') {
      originalStateForUndo.value[prop] = JSON.parse(JSON.stringify(layer[prop]));
    }
  });
}

// Update input values when selected layer changes
watch(selectedLayer, (layer) => {
  if (layer) {
    posX.value = layer.x;
    posY.value = layer.y;
    scale.value = (layer.scale?.x === layer.scale?.y) ? layer.scale.x : 1;
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
  selectedLayer.value?.scale,
  selectedLayer.value?.rotation,
  selectedLayer.value?.opacity,
  selectedLayer.value?.blendMode,
  selectedLayer.value?.visible
], ([x, y, newScale, rot, op, blend, vis]) => {
  if (selectedLayer.value) {
    posX.value = x;
    posY.value = y;
    scale.value = newScale?.x || 1;
    rotation.value = rot || 0;
    opacity.value = op;
    blendMode.value = blend || 'normal';
    visible.value = vis;
  }
}, { immediate: true });

// Handle position change
function updatePosition() {
  if (!selectedLayer.value) return;
  layersStore.updateLayer(selectedLayer.value.id, {
      x: parseFloat(posX.value),
      y: parseFloat(posY.value)
  }, originalStateForUndo.value);
  originalStateForUndo.value = {}; // Clear after use
}

// Handle scale change
function updateScale() {
  if (!selectedLayer.value) return;
  const newScaleValue = parseFloat(scale.value);
  layersStore.updateLayer(selectedLayer.value.id, {
      scale: { x: newScaleValue, y: newScaleValue }
  }, originalStateForUndo.value);
  originalStateForUndo.value = {};
}

// Handle rotation change
function updateRotation() {
  if (!selectedLayer.value) return;
  layersStore.updateLayer(selectedLayer.value.id, {
      rotation: parseFloat(rotation.value)
  }, originalStateForUndo.value);
  originalStateForUndo.value = {};
}

// Handle opacity change
function updateOpacity() {
  if (!selectedLayer.value) return;
  layersStore.updateLayer(selectedLayer.value.id, {
      opacity: parseFloat(opacity.value)
  }, originalStateForUndo.value);
  originalStateForUndo.value = {};
}

// Handle blend mode change
function updateBlendMode(mode) {
  if (!selectedLayer.value) return;
  layersStore.updateLayer(selectedLayer.value.id, {
      blendMode: mode
  }, originalStateForUndo.value);
  originalStateForUndo.value = {};
}

// Handle visibility toggle
function toggleVisibility() {
  if (!selectedLayer.value) return;
  
  const layer = selectedLayer.value;
  const originalState = { visible: layer.visible };
  const updates = { visible: !layer.visible };
  
  layersStore.updateLayer(layer.id, updates, originalState);
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
  
  const command = commandFactory.updateLayer(layer.id, updates, originalState);
  command.execute();
  historyStore.pushCommand(command);
  
  showToastMessage(`Asset applied to layer`);
}

// Handle URL update
function updateUrl(url) {
  if (!selectedLayer.value || selectedLayer.value.type !== 'url') return;
  
  const layer = selectedLayer.value;
  const originalState = { content: { ...layer.content } };
  const updates = { content: { ...layer.content, url } };
  
  const command = commandFactory.updateLayer(layer.id, updates, originalState);
  command.execute();
  historyStore.pushCommand(command);
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

// Update layer name
function updateName() {
  if (!selectedLayer.value || originalStateForUndo.value.name === undefined) return;
  layersStore.updateLayer(
    selectedLayer.value.id, 
    { name: selectedLayer.value.name }, 
    originalStateForUndo.value
  );
  originalStateForUndo.value = {};
}

// Open code editor (emits event to parent)
function openCodeEditor() {
  if (!selectedLayer.value) return;
  
  emit('requestEdit', selectedLayer.value);
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
  flex-grow: 1;
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

.input-group-vertical {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-group-vertical span {
  min-width: 40px;
  text-align: right;
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