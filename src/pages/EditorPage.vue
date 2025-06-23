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
      <PropertiesPanel @request-edit="handleRequestEdit" />
    </template>
  </EditorLayout>
</template>

<script setup>
import EditorLayout from '../layouts/EditorLayout.vue';
import TopBar from '../components/TopBar.vue';
import Sidebar from '../components/Sidebar.vue';
import CanvasStage from '../components/CanvasStage.vue';
import PropertiesPanel from '../components/PropertiesPanel.vue';

function handleRequestEdit(layer) {
  // TODO: Open Monaco editor for the layer
  console.log('Opening editor for layer:', layer);
}
</script> 