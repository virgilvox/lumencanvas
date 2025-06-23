<template>
  <header class="top-bar">
    <div class="left-tools">
      <div class="logo">LumenCanvas</div>
    </div>

    <div class="center-tools">
      <div class="tool-group segmented">
        <button class="tool-button">Scene ▾</button>
        <button class="tool-button" @click="addImageLayer">+Layer</button>
        <button class="tool-button" @click="toggleMask">Mask (M)</button>
        <button class="tool-button" @click="addShaderLayer">Shader (F2)</button>
        <button class="tool-button" @click="togglePreview">Preview (P)</button>
      </div>
    </div>

    <div class="right-tools">
      <div class="tool-group">
        <button class="tool-button save-button">
          <Save :size="16" />
          Save
        </button>
        <div class="user-avatar">JD</div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { Save } from 'lucide-vue-next';
import { useLayersStore } from '../store/layers';

const layersStore = useLayersStore();
const { LayerTypes, addLayer } = layersStore;

function addImageLayer() {
  // For now, default to image layer. Later we can show a menu
  addLayer(LayerTypes.IMAGE);
}

function addShaderLayer() {
  addLayer(LayerTypes.SHADER);
}

function toggleMask() {
  // TODO: Implement masking functionality
  console.log('Mask toggle - to be implemented');
}

function togglePreview() {
  // TODO: Implement preview/projector view
  console.log('Preview toggle - to be implemented');
}


</script>

<style scoped>
.top-bar {
  height: 48px;
  background-color: #0b0b0c;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #222;
}

.left-tools, .center-tools, .right-tools {
  display: flex;
  align-items: center;
  gap: 16px;
}

.center-tools {
  flex-grow: 1;
  justify-content: center;
}

.logo {
  font-weight: 500;
  font-size: 16px;
}

.tool-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tool-group.segmented button {
  border-radius: 0;
  border-right: 1px solid #222;
}

.tool-group.segmented button:first-child {
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
}

.tool-group.segmented button:last-child {
  border-right: none;
  border-top-right-radius: 6px;
  border-bottom-right-radius: 6px;
}

.tool-button {
  background-color: #1e1e1e;
  border: 1px solid #333;
  color: #E0E0E0;
  padding: 6px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
}

.tool-button:hover {
  background-color: #2a2a2a;
}

.save-button {
  gap: 8px;
  background-color: #12B0FF;
  color: #000;
  font-weight: 500;
}

.save-button:hover {
  background-color: #4acbff;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #333;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 14px;
}
</style> 