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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
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

onMounted(() => {
  const { yLayers, yCanvas, provider, connectionStatus, synced } = useSync(props.id);

  // Set up collaboration status tracking using existing sync status
  watch(connectionStatus, (newStatus) => {
    collaborationStatus.value.connectionStatus = newStatus;
    if (newStatus === 'connected') {
      console.log('🔗 Connected to collaboration server');
    } else if (newStatus === 'disconnected') {
      console.log('🔌 Disconnected from collaboration server');
    }
  }, { immediate: true });

  watch(synced, (isSynced) => {
    collaborationStatus.value.synced = isSynced;
    if (isSynced) {
      console.log('✅ Document synchronized');
    }
  }, { immediate: true });

  const initialData = history.state.project;
  projectStore.loadProject(props.id, initialData).then(() => {
    
    const fullSync = () => {
      const localLayers = layersStore.layers;
      yLayers.delete(0, yLayers.length);
      const ymaps = JSON.parse(JSON.stringify(localLayers)).map(layer => {
          const map = new Y.Map();
          for (const key in layer) {
              map.set(key, layer[key]);
          }
          return map;
      });
      yLayers.insert(0, ymaps);
    };

    const syncStateToYjs = () => {
      yLayers.doc.transact(() => {
        const localLayers = layersStore.layers;
        let yjsLayersArray;
        try {
          yjsLayersArray = yLayers.toArray();
        } catch (e) {
          console.warn('Yjs data structure is invalid. Forcing full sync.', e);
          fullSync();
          return;
        }

        const localIds = localLayers.map(l => l.id);
        const yjsIds = yjsLayersArray.map(l => l.id);

        const hasStructuralChange = localIds.length !== yjsIds.length || 
                                    localIds.some((id, index) => id !== yjsIds[index]);

        if (hasStructuralChange) {
          fullSync();
        } else {
          let hasInvalidYMap = false;
          
          localLayers.forEach((localLayer, index) => {
            const yLayerMap = yLayers.get(index);
            
            if (typeof yLayerMap?.get !== 'function') {
                if (!hasInvalidYMap) {
                  console.warn(`Item at index ${index} is not a Y.Map. Forcing full sync.`);
                  hasInvalidYMap = true;
                }
                return;
            }
            
            const localLayerJSON = JSON.stringify(localLayer);
            const yjsLayerJSON = JSON.stringify(yLayerMap.toJSON());

            if (localLayerJSON !== yjsLayerJSON) {
              for (const key in localLayer) {
                if(JSON.stringify(yLayerMap.get(key)) !== JSON.stringify(localLayer[key])) {
                  yLayerMap.set(key, localLayer[key]);
                }
              }
            }
          });
          
          if (hasInvalidYMap) {
            fullSync();
          }
        }

        // Sync canvas properties
        yCanvas.set('width', projectStore.canvasWidth);
        yCanvas.set('height', projectStore.canvasHeight);
        yCanvas.set('background', projectStore.canvasBackground);
      }, 'sync-state');
    };

    // Initial sync
    syncStateToYjs();

    // Listen for incoming changes from other clients
    let isUpdatingFromYjs = false;
    
    // Sync FROM Yjs TO local state when remote changes occur
    const syncFromYjs = () => {
      if (isUpdatingFromYjs) return; // Prevent infinite loops
      
      isUpdatingFromYjs = true;
      
      try {
        // Sync layers from Yjs
        const yjsLayers = yLayers.toArray().map(yLayer => yLayer.toJSON());
        if (JSON.stringify(yjsLayers) !== JSON.stringify(layersStore.layers)) {
          layersStore.importLayers(yjsLayers);
        }
        
        // Sync canvas properties from Yjs
        const yjsWidth = yCanvas.get('width');
        const yjsHeight = yCanvas.get('height');
        const yjsBackground = yCanvas.get('background');
        
        if (yjsWidth && yjsWidth !== projectStore.canvasWidth) {
          projectStore.setCanvasSize(yjsWidth, projectStore.canvasHeight);
        }
        if (yjsHeight && yjsHeight !== projectStore.canvasHeight) {
          projectStore.setCanvasSize(projectStore.canvasWidth, yjsHeight);
        }
        if (yjsBackground && yjsBackground !== projectStore.canvasBackground) {
          projectStore.setCanvasBackground(yjsBackground);
        }
      } catch (error) {
        console.warn('Error syncing from Yjs:', error);
      } finally {
        isUpdatingFromYjs = false;
      }
    };

    // Listen for changes from remote clients
    yLayers.observe(syncFromYjs);
    yCanvas.observe(syncFromYjs);

    // Watch for local changes and sync them to Yjs, but throttled
    watchThrottled(
      () => layersStore.layers, 
      () => {
        if (!isUpdatingFromYjs) { // Don't sync back changes that came from Yjs
          syncStateToYjs();
        }
      }, 
      { throttle: 50, deep: true } // Sync at most every 50ms (20fps)
    );

    // Watch for canvas changes (these are less frequent, so no debounce needed)
    watch([() => projectStore.canvasWidth, () => projectStore.canvasHeight, () => projectStore.canvasBackground], () => {
      if (!isUpdatingFromYjs) { // Don't sync back changes that came from Yjs
        yCanvas.set('width', projectStore.canvasWidth);
        yCanvas.set('height', projectStore.canvasHeight);
        yCanvas.set('background', projectStore.canvasBackground);
      }
    });
  });

  window.addEventListener('open-code-editor', handleOpenCodeEditor);
});

onUnmounted(() => {
  window.removeEventListener('open-code-editor', handleOpenCodeEditor);
});
</script>

<style scoped>
/* No specific styles needed here anymore */
</style>