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
          <label class="file-upload-button">
            <Upload :size="16" />
            <span>Upload Image</span>
            <input 
              type="file" 
              accept="image/*"
              @change="handleFileUpload"
              class="file-input"
            />
          </label>
        </div>

        <div v-if="selectedLayer.type === 'video'" class="property">
          <label>Video</label>
          <div v-if="hasPreview" class="preview-container">
            <video :src="previewSrc" class="preview-video" controls muted loop />
          </div>
          <label class="file-upload-button">
            <Upload :size="16" />
            <span>Upload Video</span>
            <input 
              type="file" 
              accept="video/*"
              @change="handleFileUpload"
              class="file-input"
            />
          </label>
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
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useLayersStore } from '../store/layers';
import { useHistoryStore } from '../store/history';
import { commandFactory } from '../utils/commandFactory';
import { X, Code, Upload } from 'lucide-vue-next';

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

// Add toast notification state
const showToast = ref(false);
const toastMessage = ref('');

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

// Handle file upload for image/video layers
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file || !selectedLayer.value) return;
  
  try {
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    const layer = selectedLayer.value;
    const originalState = { content: { ...layer.content } };
    const updates = { content: { ...layer.content, src: dataUrl } };
    
    historyStore.pushCommand(
      commandFactory.updateLayer(layer.id, updates, originalState)
    );
  } catch (error) {
    console.error('Failed to upload file:', error);
    showToastMessage('Failed to upload file');
    // Reset the file input
    event.target.value = '';
  }
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

// Determine if the layer supports file upload
const supportsFileUpload = computed(() => {
  const layer = selectedLayer.value;
  return layer && (layer.type === 'image' || layer.type === 'video');
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

// Get the accepted file types for the current layer
const acceptedFileTypes = computed(() => {
  const layer = selectedLayer.value;
  if (!layer) return '';
  
  if (layer.type === 'image') {
    return 'image/*';
  }
  
  if (layer.type === 'video') {
    return 'video/*';
  }
  
  return '';
});

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

.file-upload-button {
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

.file-upload-button:hover {
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
</style>