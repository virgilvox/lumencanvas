<template>
  <router-view />
</template>

<script setup>
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts';

// Enable global keyboard shortcuts
useKeyboardShortcuts();
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');

/* Reset default styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: #0b0b0c; /* Base background from PRD */
  color: #E0E0E0;
  font-family: 'Inter', sans-serif;
}

/* Add Inter font from Google Fonts */
</style>
