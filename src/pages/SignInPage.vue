<template>
  <div class="auth-page">
    <SignIn />
  </div>
</template>

<script setup>
import { SignIn } from '@clerk/vue';
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
</style> 