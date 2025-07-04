<template>
  <EditorLayout>
    <template #header>
      <TopBar :collaboration-status="collaborationStatus" />
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { watchThrottled } from '@vueuse/core';
import * as Y from 'yjs';
import EditorLayout from '../layouts/EditorLayout.vue';
import Sidebar from '../components/Sidebar.vue';
import CanvasStage from '../components/CanvasStage.vue';
import PropertiesPanel from '../components/PropertiesPanel.vue';
import CodeEditor from '../components/CodeEditor.vue';
import TopBar from '../components/TopBar.vue';
import { useLayersStore } from '../store/layers';
import { useProjectStore } from '../store/project';
import { useSync } from '../composables/useSync';

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

const layersStore = useLayersStore();
const projectStore = useProjectStore();

// Code editor state
const showCodeEditor = ref(false);
const editingLayer = ref(null);

// Collaboration status
const collaborationStatus = ref({
  connectionStatus: 'disconnected', // 'connected', 'connecting', 'disconnected'
  synced: false,
  connectedUsers: 0
});

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

onMounted(async () => {
  // 1. Load project from API - this is the source of truth.
  await projectStore.loadProject(props.id);
  
  // 2. Connect to Yjs to broadcast state.
  const { yLayers, yCanvas, connectionStatus } = useSync(props.id);
  
  // Update UI with connection status.
  watch(connectionStatus, (newStatus) => {
    collaborationStatus.value.connectionStatus = newStatus;
  }, { immediate: true });

  // 3. Set up a ONE-WAY broadcast from Pinia to Yjs (throttled).
  watchThrottled(
    () => [layersStore.layers, projectStore.canvasWidth, projectStore.canvasHeight, projectStore.canvasBackground],
    ([newLayers, width, height, bg]) => {
      yLayers.doc.transact(() => {
        // Full state overwrite on every change for simplicity and robustness.
        const ymaps = JSON.parse(JSON.stringify(newLayers)).map(layer => {
          const map = new Y.Map();
          for (const key in layer) {
            map.set(key, layer[key]);
          }
          return map;
        });
        yLayers.delete(0, yLayers.length);
        yLayers.insert(0, ymaps);
        
        yCanvas.set('width', width);
        yCanvas.set('height', height);
        yCanvas.set('background', bg);
      }, 'broadcast-editor-state');
    },
    { throttle: 100, deep: true, immediate: true } // immediate: true ensures the initial state is pushed
  );

  window.addEventListener('open-code-editor', handleOpenCodeEditor);
});

onUnmounted(() => {
  window.removeEventListener('open-code-editor', handleOpenCodeEditor);
});
</script>

<style scoped>
/* No specific styles needed here anymore */
</style>