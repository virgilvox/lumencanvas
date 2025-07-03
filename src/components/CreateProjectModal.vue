<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="closeModal">
        <div class="modal-container">
          <div class="modal-header">
            <h3>Create New Project</h3>
            <button class="close-btn" @click="closeModal" title="Close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-content">
            <div class="form-group">
              <label for="projectName">Project Name</label>
              <input id="projectName" type="text" v-model="form.name" />
            </div>
            <div class="form-group">
              <label for="projectDescription">Description</label>
              <textarea id="projectDescription" v-model="form.description"></textarea>
            </div>
            <div class="form-group canvas-size">
              <div>
                <label for="canvasWidth">Canvas Width</label>
                <input id="canvasWidth" type="number" v-model.number="form.width" />
              </div>
              <div>
                <label for="canvasHeight">Canvas Height</label>
                <input id="canvasHeight" type="number" v-model.number="form.height" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="closeModal">Cancel</button>
            <button class="btn-primary" @click="handleCreate" :disabled="isCreating">
              {{ isCreating ? 'Creating...' : 'Create Project' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import { generateProjectName } from '../utils/nameGenerator';
import api from '../services/api';
import { useSession } from '@clerk/vue';

const props = defineProps({
  modelValue: { type: Boolean, required: true },
});

const emit = defineEmits(['update:modelValue', 'project-created']);

const { session } = useSession();
const isCreating = ref(false);
const form = ref({
  name: '',
  description: '',
  width: 1280,
  height: 720,
});

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    form.value.name = generateProjectName();
    form.value.description = '';
    form.value.width = 1280;
    form.value.height = 720;
  }
});

function closeModal() {
  emit('update:modelValue', false);
}

async function handleCreate() {
  isCreating.value = true;
  try {
    const newProject = await api.projects.create({
      name: form.value.name,
      description: form.value.description,
      width: form.value.width,
      height: form.value.height,
    });
    
    emit('project-created', newProject);
    closeModal();
  } catch (error) {
    console.error('Failed to create project:', error);
    // You could emit an error event here to show a toast in the parent
  } finally {
    isCreating.value = false;
  }
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
  background-color: #1e1e1e;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #333;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-size: 1.25rem;
}

.modal-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #aaa;
}

.form-group input,
.form-group textarea {
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 0.75rem;
  color: #e0e0e0;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.canvas-size {
  flex-direction: row;
  gap: 1rem;
}
.canvas-size > div {
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #333;
}

.btn-secondary, .btn-primary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background-color: #333;
  color: #e0e0e0;
}

.btn-primary {
  background-color: #12B0FF;
  color: #000;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style> 