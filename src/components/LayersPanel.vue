<template>
  <div class="panel-content">
    <div class="layer-item active">
      <div class="layer-color-swatch" style="background-color: #12B0FF;"></div>
      <span class="layer-name">GLSL Shader</span>
    </div>
    <div class="layer-item">
      <div class="layer-color-swatch" style="background-color: #FF456A;"></div>
      <span class="layer-name">Video Loop</span>
    </div>
    <div class="layer-item">
      <div class="layer-color-swatch" style="background-color: #26D7AE;"></div>
      <span class="layer-name">Background</span>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.panel-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
}

.layer-item:hover {
  background-color: #2a2a2a;
}

.layer-item.active {
  background-color: rgba(18, 176, 255, 0.1);
  color: #12B0FF;
}

.layer-item.active .layer-name {
  font-weight: 500;
}

.layer-color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
}
</style> 