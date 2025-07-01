<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="closeModal">
        <div class="modal-container">
          <div class="modal-header">
            <h3>Project Settings</h3>
            <button class="close-btn" @click="closeModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-content">
            <div class="settings-section">
              <h4>Canvas</h4>
              <div class="setting-item">
                <label>Width:</label>
                <input 
                  type="number" 
                  v-model="canvasWidth" 
                  min="100" 
                  max="4096"
                />
              </div>
              <div class="setting-item">
                <label>Height:</label>
                <input 
                  type="number" 
                  v-model="canvasHeight" 
                  min="100" 
                  max="4096"
                />
              </div>
              <div class="setting-item">
                <label>Background:</label>
                <input 
                  type="color" 
                  v-model="canvasBackground"
                />
              </div>
            </div>
            <div class="settings-section">
              <h4>Project Details</h4>
              <div class="setting-item">
                <label>Name:</label>
                <input 
                  type="text" 
                  v-model="projectName" 
                  placeholder="Untitled Project"
                />
              </div>
              <div class="setting-item">
                <label>Description:</label>
                <textarea 
                  v-model="projectDescription" 
                  placeholder="Project description..."
                ></textarea>
              </div>
            </div>
            <div class="settings-section">
              <h4>Storage</h4>
              <div class="setting-item">
                <label>Provider:</label>
                <select v-model="storageProvider">
                  <option value="indexeddb">Browser Storage (IndexedDB)</option>
                  <option value="cloud" disabled>Cloud Storage (Coming Soon)</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="closeModal">Cancel</button>
            <button class="save-btn" @click="saveSettings">Save Settings</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useProjectStore } from '../store/project';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'saved']);

const projectStore = useProjectStore();

// Form values
const canvasWidth = ref(1280);
const canvasHeight = ref(720);
const canvasBackground = ref('#000000');
const projectName = ref('Untitled Project');
const projectDescription = ref('');
const storageProvider = ref('indexeddb');

// Initialize values when modal opens
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    canvasWidth.value = projectStore.canvasWidth || 1280;
    canvasHeight.value = projectStore.canvasHeight || 720;
    canvasBackground.value = projectStore.canvasBackground || '#000000';
    projectName.value = projectStore.projectName || 'Untitled Project';
    projectDescription.value = projectStore.projectDescription || '';
    storageProvider.value = 'indexeddb'; // Default to indexeddb for now
  }
}, { immediate: true });

// Close the modal
function closeModal() {
  emit('update:modelValue', false);
}

// Save settings
function saveSettings() {
  // Update canvas size
  if (projectStore.canvasWidth !== parseInt(canvasWidth.value) || 
      projectStore.canvasHeight !== parseInt(canvasHeight.value)) {
    // Update canvas dimensions
    projectStore.canvasWidth = parseInt(canvasWidth.value) || 1280;
    projectStore.canvasHeight = parseInt(canvasHeight.value) || 720;
  }
  
  // Update other settings
  projectStore.projectName = projectName.value;
  projectStore.projectDescription = projectDescription.value;
  
  // Emit saved event
  emit('saved');
  
  // Close modal
  closeModal();
}
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

.setting-item input[type="color"] {
  flex: 1;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 4px;
  height: 36px;
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