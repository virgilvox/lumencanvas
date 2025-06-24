<template>
  <div class="layers-panel">
    <div class="panel-header">
      <button class="add-layer-btn" @click="showAddMenu = !showAddMenu">
        <Plus :size="16" />
        Add Layer
      </button>
      
      <!-- Add Layer Menu -->
      <div v-if="showAddMenu" class="add-menu">
        <button 
          v-for="(type, key) in layerTypes" 
          :key="key"
          @click="addNewLayer(type)"
          class="menu-item"
        >
          <component :is="getIcon(type)" :size="16" />
          {{ type.charAt(0).toUpperCase() + type.slice(1) }}
        </button>
      </div>
    </div>

    <div class="layer-list">
      <TransitionGroup name="layer-list" tag="div">
        <div
          v-for="(layer, index) in layers"
          :key="layer.id"
          :class="['layer-item', { active: selectedLayerId === layer.id }]"
          @click="selectLayer(layer.id)"
          draggable="true"
          @dragstart="startDrag(index)"
          @dragover.prevent
          @drop="handleDrop(index)"
        >
          <div class="layer-visibility">
            <button 
              @click.stop="toggleVisibility(layer.id)"
              class="visibility-btn"
            >
              <component 
                :is="layer.visible ? Eye : EyeOff" 
                :size="14" 
              />
            </button>
          </div>
          
          <div class="layer-info">
            <div class="layer-name">{{ layer.name }}</div>
            <div class="layer-type">{{ layer.type }}</div>
          </div>
          
          <div class="layer-actions">
            <button 
              @click.stop="duplicateLayer(layer.id)"
              class="action-btn"
              title="Duplicate"
            >
              <Copy :size="14" />
            </button>
            <button 
              @click.stop="removeLayer(layer.id)"
              class="action-btn"
              title="Delete"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </TransitionGroup>
      
      <div v-if="layers.length === 0" class="empty-state">
        No layers yet. Click "Add Layer" to start.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useLayersStore } from '../store/layers';
import { 
  Plus, 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2, 
  Image, 
  Film, 
  Globe, 
  Code, 
  Sparkles 
} from 'lucide-vue-next';

const layersStore = useLayersStore();
const { layers, selectedLayerId } = storeToRefs(layersStore);
const { 
  LayerTypes, 
  addLayer, 
  removeLayer, 
  updateLayer, 
  reorderLayers, 
  duplicateLayer, 
  selectLayer 
} = layersStore;

const showAddMenu = ref(false);
const draggedIndex = ref(null);

const layerTypes = LayerTypes;

function getIcon(type) {
  const icons = {
    [LayerTypes.IMAGE]: Image,
    [LayerTypes.VIDEO]: Film,
    [LayerTypes.URL]: Globe,
    [LayerTypes.HTML]: Code,
    [LayerTypes.SHADER]: Sparkles,
  };
  return icons[type] || Image;
}

function addNewLayer(type) {
  addLayer(type);
  showAddMenu.value = false;
}

function toggleVisibility(id) {
  const layer = layers.value.find(l => l.id === id);
  if (layer) {
    updateLayer(id, { visible: !layer.visible });
  }
}

function startDrag(index) {
  draggedIndex.value = index;
}

function handleDrop(dropIndex) {
  if (draggedIndex.value !== null && draggedIndex.value !== dropIndex) {
    reorderLayers(draggedIndex.value, dropIndex);
  }
  draggedIndex.value = null;
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.panel-header')) {
    showAddMenu.value = false;
  }
});
</script>

<style scoped>
.layers-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  position: relative;
  margin-bottom: 8px;
}

.add-layer-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background-color: #12B0FF;
  color: #000;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-layer-btn:hover {
  background-color: #4acbff;
}

.add-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background-color: #1e1e1e;
  border: 1px solid #333;
  border-radius: 6px;
  overflow: hidden;
  z-index: 10;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: none;
  border: none;
  color: #E0E0E0;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  text-align: left;
}

.menu-item:hover {
  background-color: #2a2a2a;
}

.layer-list {
  flex: 1;
  overflow-y: auto;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #1a1a1a;
}

.layer-item:hover {
  background-color: #2a2a2a;
}

.layer-item.active {
  background-color: rgba(18, 176, 255, 0.1);
  outline: 1px solid #12B0FF;
}

.layer-visibility {
  display: flex;
  align-items: center;
}

.visibility-btn {
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

.visibility-btn:hover {
  color: #E0E0E0;
}

.layer-info {
  flex: 1;
  min-width: 0;
}

.layer-name {
  font-size: 14px;
  font-weight: 500;
  color: #E0E0E0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-type {
  font-size: 12px;
  color: #666;
  text-transform: capitalize;
}

.layer-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.layer-item:hover .layer-actions {
  opacity: 1;
}

.action-btn {
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

.action-btn:hover {
  color: #E0E0E0;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 24px;
  font-size: 14px;
}

/* Transition animations */
.layer-list-move,
.layer-list-enter-active,
.layer-list-leave-active {
  transition: all 0.3s ease;
}

.layer-list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.layer-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.layer-list-leave-active {
  position: absolute;
  right: 0;
  left: 0;
}
</style> 