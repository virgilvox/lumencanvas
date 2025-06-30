<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="collapse-toggle" @click="toggleCollapse">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6" v-if="!isCollapsed"></polyline>
        <polyline points="9 18 15 12 9 6" v-else></polyline>
      </svg>
    </div>
    
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-button"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">
          <!-- Layers Icon -->
          <svg v-if="tab.id === 'layers'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          
          <!-- Assets Icon -->
          <svg v-else-if="tab.id === 'assets'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </span>
        <span class="tab-label" v-if="!isCollapsed">{{ tab.name }}</span>
      </button>
    </div>
    
    <div class="tab-content">
      <!-- Layers Panel -->
      <div v-show="activeTab === 'layers'" class="panel">
        <LayersPanel v-if="!isCollapsed" />
      </div>
      
      <!-- Assets Panel -->
      <div v-show="activeTab === 'assets'" class="panel">
        <AssetsPanel v-if="!isCollapsed" />
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import LayersPanel from './LayersPanel.vue';
import AssetsPanel from './AssetsPanel.vue';

// Define tabs
const tabs = [
  { id: 'layers', name: 'Layers' },
  { id: 'assets', name: 'Assets' }
];

// State
const activeTab = ref('layers');
const isCollapsed = ref(false);

// Load saved state on mount
onMounted(() => {
  const savedState = localStorage.getItem('sidebar-collapsed');
  if (savedState !== null) {
    isCollapsed.value = savedState === 'true';
  }
});

// Toggle sidebar collapse
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
  // Store preference in localStorage
  localStorage.setItem('sidebar-collapsed', isCollapsed.value);
  // Dispatch custom event for EditorLayout to detect
  window.dispatchEvent(new CustomEvent('sidebar-toggle', { 
    detail: { collapsed: isCollapsed.value } 
  }));
}
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
  color: #e0e0e0;
  height: 100%;
  width: 320px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 50px;
}

.collapse-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: background-color 0.2s;
}

.collapse-toggle:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.tabs {
  display: flex;
  flex-direction: row;
  padding: 12px 10px;
  border-bottom: 1px solid #333;
}

.sidebar.collapsed .tabs {
  flex-direction: column;
  border-bottom: none;
  padding-top: 50px; /* Additional space for collapse button */
}

.tab-button {
  background: none;
  border: none;
  color: #999;
  padding: 8px 12px;
  margin-right: 5px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.sidebar.collapsed .tab-button {
  justify-content: center;
  padding: 8px;
  margin-right: 0;
  margin-bottom: 5px;
}

.tab-button:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: #e0e0e0;
}

.tab-button.active {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.tab-icon {
  margin-right: 8px;
  display: flex;
  align-items: center;
}

.sidebar.collapsed .tab-icon {
  margin-right: 0;
}

.tab-label {
  font-size: 0.9rem;
  white-space: nowrap;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
}

.panel {
  height: 100%;
}
</style> 