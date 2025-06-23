<template>
  <aside class="sidebar">
    <div class="sidebar-section">
      <h3 class="section-title">Layers</h3>
      <LayersPanel />
    </div>
    <div class="sidebar-section">
      <h3 class="section-title">Scenes</h3>
      <div class="panel-content">
        <!-- Scenes list will go here -->
        <p class="placeholder-text">Scene 1</p>
      </div>
    </div>
    <div class="sidebar-section">
      <h3 class="section-title">Assets</h3>
      <div class="panel-content">
        <!-- Assets list will go here -->
        <p class="placeholder-text">image.png</p>
        <p class="placeholder-text">video.mp4</p>
      </div>
    </div>
  </aside>
</template>

<script setup>
import LayersPanel from './LayersPanel.vue';
</script>

<style scoped>
.sidebar {
  width: 280px;
  background-color: #111213;
  border-right: 1px solid #222;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 24px;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: #888;
  text-transform: uppercase;
  padding: 0 8px;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.placeholder-text {
  background-color: #1e1e1e;
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;
}
</style> 