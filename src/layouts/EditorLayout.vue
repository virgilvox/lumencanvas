<template>
  <div class="editor-layout">
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

<style scoped>
.editor-layout {
  display: grid;
  grid-template-columns: 280px 1fr; /* Sidebar width from PRD */
  grid-template-rows: 48px 1fr; /* Top bar height from PRD */
  grid-template-areas:
    "header header"
    "sidebar main";
  height: 100vh;
  width: 100vw;
  background-color: var(--canvas-bg, #000);
}

.editor-header {
  grid-area: header;
  background-color: var(--bg, #0b0b0c);
  z-index: 10;
}

.editor-sidebar {
  grid-area: sidebar;
  background-color: var(--sidebar-bg, #111213);
  overflow-y: auto;
}

.editor-main {
  grid-area: main;
  position: relative; /* For canvas positioning */
  overflow: hidden;
}
</style> 