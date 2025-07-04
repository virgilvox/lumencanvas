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
  // 1. Load the project from the API first. This is the source of truth.
  await projectStore.loadProject(props.id);
  
  // 2. Now that Pinia stores are populated, connect to Yjs.
  const { yLayers, yCanvas, connectionStatus, synced } = useSync(props.id);

  // Watch for connection status changes
  watch(connectionStatus, (newStatus) => {
    collaborationStatus.value.connectionStatus = newStatus;
  }, { immediate: true });

  watch(synced, (isSynced) => {
    collaborationStatus.value.synced = isSynced;
    if (isSynced) {
      collaborationStatus.value.connectionStatus = 'connected';
    }
  }, { immediate: true });

  // 3. Set up a two-way binding between Pinia store and Yjs
  let localChange = false;

  // Sync from Yjs to Pinia for changes from other clients
  const syncFromYjs = () => {
    if (localChange) return;
    const layersFromYjs = yLayers.toArray().map(yMap => yMap.toJSON());
    if (JSON.stringify(layersFromYjs) !== JSON.stringify(layersStore.layers)) {
      layersStore.importLayers(layersFromYjs);
    }
  };
  yLayers.observeDeep(syncFromYjs);

  // Sync from Pinia to Yjs (throttled)
  // This watcher will also handle the initial push of data to Yjs
  watch(
    () => layersStore.layers,
    (newLayers) => {
      localChange = true;
      yLayers.doc.transact(() => {
        // Simple and robust: clear and re-insert.
        yLayers.delete(0, yLayers.length);
        const ymaps = JSON.parse(JSON.stringify(newLayers)).map(layer => {
          const map = new Y.Map();
          for (const key in layer) {
            map.set(key, layer[key]);
          }
          return map;
        });
        yLayers.insert(0, ymaps);
      }, 'update-from-pinia');
      // Use nextTick to ensure the transaction is processed before allowing syncFromYjs to run
      nextTick(() => {
        localChange = false;
      });
    },
    { deep: true, immediate: true } // immediate: true ensures the initial state is pushed
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