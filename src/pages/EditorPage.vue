<template>
  <EditorLayout>
    <template #header>
      <TopBar />
    </template>
    <template #sidebar>
      <Sidebar />
    </template>
    <template #main>
      <CanvasStage @request-edit="handleRequestEdit" />
      <PropertiesPanel @request-edit="handleRequestEdit" />
      
      <!-- Code Editor Modal -->
      <CodeEditor
        v-model="showCodeEditor"
        :layer="editingLayer"
        :initial-code="editorInitialCode"
        :language="editorLanguage"
        @apply="handleCodeApply"
      />
    </template>
  </EditorLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import EditorLayout from '../layouts/EditorLayout.vue';
import TopBar from '../components/TopBar.vue';
import Sidebar from '../components/Sidebar.vue';
import CanvasStage from '../components/CanvasStage.vue';
import PropertiesPanel from '../components/PropertiesPanel.vue';
import CodeEditor from '../components/CodeEditor.vue';
import { useLayersStore } from '../store/layers';

const layersStore = useLayersStore();

// Code editor state
const showCodeEditor = ref(false);
const editingLayer = ref(null);

const editorInitialCode = computed(() => {
  if (!editingLayer.value) return '';
  
  const type = editingLayer.value.type;
  if (type === layersStore.LayerTypes.SHADER) {
    return editingLayer.value.content.code || '';
  } else if (type === layersStore.LayerTypes.HTML) {
    return editingLayer.value.content.html || '';
  }
  
  return '';
});

const editorLanguage = computed(() => {
  if (!editingLayer.value) return 'glsl';
  
  const type = editingLayer.value.type;
  if (type === layersStore.LayerTypes.SHADER) {
    return 'glsl';
  } else if (type === layersStore.LayerTypes.HTML) {
    return 'html';
  }
  
  return 'glsl';
});

function handleRequestEdit(layer) {
  editingLayer.value = layer;
  showCodeEditor.value = true;
}

function handleCodeApply(newCode) {
  if (!editingLayer.value) return;
  
  const type = editingLayer.value.type;
  if (type === layersStore.LayerTypes.SHADER) {
    layersStore.updateLayer(editingLayer.value.id, {
      content: { ...editingLayer.value.content, code: newCode }
    });
  } else if (type === layersStore.LayerTypes.HTML) {
    layersStore.updateLayer(editingLayer.value.id, {
      content: { ...editingLayer.value.content, html: newCode }
    });
  }
}

// Listen for keyboard shortcut event
function handleOpenCodeEditor(event) {
  handleRequestEdit(event.detail);
}

onMounted(() => {
  window.addEventListener('open-code-editor', handleOpenCodeEditor);
});

onUnmounted(() => {
  window.removeEventListener('open-code-editor', handleOpenCodeEditor);
});
</script> 