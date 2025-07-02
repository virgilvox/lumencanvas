<template>
  <div class="landing-page">
    <div class="background-glow"></div>
    <div class="content">
      <h1 class="title">LumenCanvas</h1>
      <p class="subtitle">Projection Mapping, Reimagined in the Browser.</p>
      <p class="description">
        A zero-install, browser-native projection mapping studio with drag-warp
        simplicity and live coding capabilities.
      </p>
      <button class="cta-button" @click="goToDashboard">
        Start Creating
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

function goToDashboard() {
  router.push('/dashboard');
}
</script>

<style scoped>
.landing-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background-color: #0b0b0c;
  color: #E0E0E0;
  text-align: center;
  overflow: hidden;
  position: relative;
}

.background-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, rgba(18, 176, 255, 0.15) 0%, rgba(18, 176, 255, 0) 70%);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title {
  font-size: 5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  letter-spacing: -2px;
  background: -webkit-linear-gradient(45deg, #12B0FF, #E0E0E0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 1.5rem;
  font-weight: 400;
  margin-bottom: 1.5rem;
  color: #aaa;
}

.description {
  max-width: 500px;
  font-size: 1rem;
  color: #888;
  margin-bottom: 2.5rem;
  line-height: 1.6;
}

.cta-button {
  padding: 12px 24px;
  background-color: #12B0FF;
  color: #000;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 20px rgba(18, 176, 255, 0.2);
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(18, 176, 255, 0.3);
}
</style> 