<template>
  <div class="editor-layout" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <header class="editor-header">
      <slot name="header"></slot>
    </header>
    <aside class="editor-sidebar">
      <slot name="sidebar"></slot>
    </aside>
    <main class="editor-main">
      <slot name="main"></slot>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const isSidebarCollapsed = ref(false);

// Function to check sidebar state from localStorage
function checkSidebarState() {
  const savedState = localStorage.getItem('sidebar-collapsed');
  if (savedState !== null) {
    isSidebarCollapsed.value = savedState === 'true';
  }
}

// Listen for sidebar toggle events
function handleSidebarToggle(event) {
  if (event.detail && typeof event.detail.collapsed === 'boolean') {
    isSidebarCollapsed.value = event.detail.collapsed;
  } else {
    checkSidebarState();
  }
}

// Setup event listeners
onMounted(() => {
  // Initial check
  checkSidebarState();
  
  // Listen for storage events (if sidebar is toggled in another window)
  window.addEventListener('storage', (e) => {
    if (e.key === 'sidebar-collapsed') {
      checkSidebarState();
    }
  });
  
  // Listen for custom sidebar toggle events
  window.addEventListener('sidebar-toggle', handleSidebarToggle);
});

// Clean up event listeners
onBeforeUnmount(() => {
  window.removeEventListener('storage', checkSidebarState);
  window.removeEventListener('sidebar-toggle', handleSidebarToggle);
});
</script>

<style scoped>
.editor-layout {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main";
  grid-template-columns: 320px 1fr;
  grid-template-rows: 60px 1fr;
  height: 100vh;
  transition: all 0.3s ease;
}

.editor-layout.sidebar-collapsed {
  grid-template-columns: 50px 1fr;
}

.editor-header {
  grid-area: header;
  background-color: #1a1a1a;
  border-bottom: 1px solid #333;
}

.editor-sidebar {
  grid-area: sidebar;
  background-color: #1e1e1e;
  border-right: 1px solid #333;
  overflow: hidden;
}

.editor-main {
  grid-area: main;
  background-color: #121212;
  overflow: hidden;
}
</style> 