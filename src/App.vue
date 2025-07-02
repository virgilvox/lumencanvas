<template>
  <div class="app-container">
    <header v-if="isSignedIn && $route.name !== 'editor'" class="app-header">
      <div class="logo-area">
        <router-link to="/dashboard">LumenCanvas</router-link>
      </div>
      <div class="user-area">
        <SignedIn>
          <UserButton after-sign-out-url="/" />
        </SignedIn>
      </div>
    </header>
    <main class="app-main" :class="{ 'full-height': $route.name === 'editor' }">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { SignedIn, UserButton, useAuth } from '@clerk/vue';
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts';
import { useProjectStore } from './store/project';

// Clerk is initialized in main.js, no key needed here.

// Enable global keyboard shortcuts
useKeyboardShortcuts();

const { isSignedIn } = useAuth();
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

.app-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background-color: var(--panel-bg);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.logo-area a {
  font-weight: 500;
  font-size: 16px;
  color: var(--text-primary);
  text-decoration: none;
}

.app-main {
  flex-grow: 1;
  overflow-y: auto;
}

.app-main.full-height {
  height: 100vh;
}

.user-area {
  display: flex;
  align-items: center;
}
</style>
