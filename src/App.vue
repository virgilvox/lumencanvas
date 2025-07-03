<template>
  <div class="app-container">
    <main class="app-main" :class="{ 'full-height': $route.name === 'editor' || $route.name === 'landing' }">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts';

// Enable global keyboard shortcuts
useKeyboardShortcuts();
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');

:root {
  --background: #0b0b0c;
  --sidebar-bg: #111213;
  --panel-bg: #1e1e1e;
  --border-color: #333;
  --text-primary: #E0E0E0;
  --text-secondary: #888;
  --accent: #12B0FF;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app, .app-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--background);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
}

.app-container {
  display: flex;
  flex-direction: column;
}

.app-main {
  flex-grow: 1;
  overflow-y: auto;
  height: 100%;
}

.app-main.full-height {
  height: 100vh;
  overflow: hidden; /* Prevent scrollbars on editor/landing */
}
</style>
