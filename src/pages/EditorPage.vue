<template>
  <EditorLayout>
    <template #header>
      <TopBar />
    </template>
    <template #sidebar>
      <Sidebar />
    </template>
    <template #main>
      <CanvasStage />
    </template>
  </EditorLayout>
</template>

<script setup>
import EditorLayout from '../layouts/EditorLayout.vue';
import TopBar from '../components/TopBar.vue';
import Sidebar from '../components/Sidebar.vue';
import CanvasStage from '../components/CanvasStage.vue';
</script> 