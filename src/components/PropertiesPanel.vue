<template>
  <div v-if="selectedLayer" class="properties-panel">
    <div class="panel-header">
      <h3>{{ selectedLayer.name }}</h3>
      <button @click="clearSelection" class="close-btn">
        <X :size="16" />
      </button>
    </div>
    
    <div class="panel-content">
      <!-- Common properties -->
      <div class="property-group">
        <h4>Transform</h4>
        
        <div class="property-row">
          <label>Position</label>
          <div class="input-group">
            <input 
              type="number" 
              v-model.number="selectedLayer.position.x"
              @input="updateProperty('position', selectedLayer.position)"
              placeholder="X"
            />
            <input 
              type="number" 
              v-model.number="selectedLayer.position.y"
              @input="updateProperty('position', selectedLayer.position)"
              placeholder="Y"
            />
          </div>
        </div>
        
        <div class="property-row">
          <label>Scale</label>
          <div class="input-group">
            <input 
              type="number" 
              v-model.number="selectedLayer.scale.x"
              @input="updateProperty('scale', selectedLayer.scale)"
              step="0.1"
              placeholder="X"
            />
            <input 
              type="number" 
              v-model.number="selectedLayer.scale.y"
              @input="updateProperty('scale', selectedLayer.scale)"
              step="0.1"
              placeholder="Y"
            />
          </div>
        </div>
        
        <div class="property-row">
          <label>Rotation</label>
          <input 
            type="number" 
            v-model.number="selectedLayer.rotation"
            @input="updateProperty('rotation', selectedLayer.rotation)"
            step="1"
            placeholder="Degrees"
          />
        </div>
      </div>
      
      <!-- Appearance properties -->
      <div class="property-group">
        <h4>Appearance</h4>
        
        <div class="property-row">
          <label>Opacity</label>
          <input 
            type="range" 
            v-model.number="selectedLayer.opacity"
            @input="updateProperty('opacity', selectedLayer.opacity)"
            min="0"
            max="1"
            step="0.01"
          />
          <span class="value">{{ Math.round(selectedLayer.opacity * 100) }}%</span>
        </div>
        
        <div class="property-row">
          <label>Blend Mode</label>
          <select 
            v-model="selectedLayer.blendMode"
            @change="updateProperty('blendMode', selectedLayer.blendMode)"
          >
            <option v-for="(mode, key) in BlendModes" :key="key" :value="mode">
              {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
            </option>
          </select>
        </div>
      </div>
      
      <!-- Type-specific properties -->
      <div v-if="selectedLayer.type === LayerTypes.VIDEO" class="property-group">
        <h4>Video Settings</h4>
        
        <div class="property-row">
          <label>Volume</label>
          <input 
            type="range" 
            v-model.number="selectedLayer.properties.volume"
            @input="updateProperties({ volume: selectedLayer.properties.volume })"
            min="0"
            max="1"
            step="0.01"
          />
          <span class="value">{{ Math.round(selectedLayer.properties.volume * 100) }}%</span>
        </div>
        
        <div class="property-row">
          <label>Playback Rate</label>
          <input 
            type="number" 
            v-model.number="selectedLayer.properties.playbackRate"
            @input="updateProperties({ playbackRate: selectedLayer.properties.playbackRate })"
            min="0.25"
            max="4"
            step="0.25"
          />
        </div>
        
        <div class="property-row">
          <label>Loop</label>
          <input 
            type="checkbox" 
            v-model="selectedLayer.content.loop"
            @change="updateContent({ loop: selectedLayer.content.loop })"
          />
        </div>
      </div>
      
      <!-- Shader-specific properties -->
      <div v-if="selectedLayer.type === LayerTypes.SHADER" class="property-group">
        <h4>Shader</h4>
        <button @click="$emit('requestEdit', selectedLayer)" class="edit-btn">
          <Code :size="16" />
          Edit Code
        </button>
      </div>
      
      <!-- URL-specific properties -->
      <div v-if="selectedLayer.type === LayerTypes.URL" class="property-group">
        <h4>URL Settings</h4>
        
        <div class="property-row">
          <label>URL</label>
          <input 
            type="text" 
            v-model="selectedLayer.content.url"
            @input="updateContent({ url: selectedLayer.content.url })"
            placeholder="https://example.com"
          />
        </div>
        
        <div class="property-row">
          <label>Interactive</label>
          <input 
            type="checkbox" 
            v-model="selectedLayer.properties.interactive"
            @change="updateProperties({ interactive: selectedLayer.properties.interactive })"
          />
        </div>
        
        <div class="property-row">
          <label>Scrollable</label>
          <input 
            type="checkbox" 
            v-model="selectedLayer.properties.scrollable"
            @change="updateProperties({ scrollable: selectedLayer.properties.scrollable })"
          />
        </div>
      </div>
      
      <!-- HTML-specific properties -->
      <div v-if="selectedLayer.type === LayerTypes.HTML" class="property-group">
        <h4>HTML</h4>
        <button @click="$emit('requestEdit', selectedLayer)" class="edit-btn">
          <Code :size="16" />
          Edit HTML
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useLayersStore } from '../store/layers';
import { X, Code } from 'lucide-vue-next';

const emit = defineEmits(['requestEdit']);

const layersStore = useLayersStore();
const { selectedLayer } = storeToRefs(layersStore);
const { LayerTypes, BlendModes, updateLayer, clearSelection } = layersStore;

function updateProperty(key, value) {
  if (selectedLayer.value) {
    updateLayer(selectedLayer.value.id, { [key]: value });
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

.property-group {
  margin-bottom: 20px;
}

.property-group:last-child {
  margin-bottom: 0;
}

.property-group h4 {
  font-size: 12px;
  font-weight: 500;
  color: #888;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.property-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.property-row:last-child {
  margin-bottom: 0;
}

.property-row label {
  font-size: 14px;
  color: #aaa;
  width: 80px;
  flex-shrink: 0;
}

.property-row input[type="number"],
.property-row input[type="text"],
.property-row select {
  flex: 1;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 6px 8px;
  color: #E0E0E0;
  font-size: 14px;
}

.property-row input[type="range"] {
  flex: 1;
}

.property-row input[type="checkbox"] {
  width: auto;
}

.input-group {
  display: flex;
  gap: 8px;
  flex: 1;
}

.input-group input {
  flex: 1;
}

.value {
  font-size: 12px;
  color: #888;
  width: 40px;
  text-align: right;
}

.edit-btn {
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

.edit-btn:hover {
  background-color: #4acbff;
}
</style>