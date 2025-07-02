<template>
  <div class="auth-page">
    <SignUp />
  </div>
</template>

<script setup>
import { SignUp } from '@clerk/vue';
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
</style> 