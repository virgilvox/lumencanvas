import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useLayersStore } from './layers';
import { 
  saveProject as saveProjectToDB,
  getProject,
  enableAutoSave,
  exportProject as exportProjectFromDB,
  saveBlobAsset
} from '../services/storage';

export const useProjectStore = defineStore('project', () => {
  // State
  const projectId = ref(null);
  const projectName = ref('Untitled Project');
  const projectDescription = ref('');
  const warpPoints = ref([
    { x: 100, y: 100 },
    { x: 400, y: 100 },
    { x: 450, y: 400 },
    { x: 50, y: 350 },
  ]);
  const isSaving = ref(false);
  const lastSaved = ref(null);
  const isLoading = ref(false);

  // Get layers store
  const layersStore = useLayersStore();

  // Computed
  const hasUnsavedChanges = computed(() => {
    // In a real app, we'd track actual changes
    return false; // For now, auto-save handles everything
  });

  const projectData = computed(() => ({
    id: projectId.value,
    name: projectName.value,
    description: projectDescription.value,
    warpPoints: warpPoints.value,
    layers: layersStore.layers,
    created: projectId.value ? undefined : new Date().toISOString(),
    version: '1.0'
  }));

  // Initialize project
  async function initProject() {
    // Generate project ID if not exists
    if (!projectId.value) {
      projectId.value = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Enable auto-save
    const cleanup = enableAutoSave(() => projectData.value, 5000);
    
    // Save initial state
    await saveProject();

    // Return cleanup function
    return cleanup;
  }

  // Save project
  async function saveProject() {
    if (!projectId.value) return;
    
    isSaving.value = true;
    try {
      await saveProjectToDB(projectData.value);
      lastSaved.value = new Date();
    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    } finally {
      isSaving.value = false;
    }
  }

  // Load project
  async function loadProject(id) {
    isLoading.value = true;
    try {
      const project = await getProject(id);
      if (!project) {
        throw new Error('Project not found');
      }

      // Load project data
      projectId.value = project.id;
      projectName.value = project.name;
      projectDescription.value = project.description || '';
      warpPoints.value = project.warpPoints || warpPoints.value;

      // Load layers
      if (project.layers && project.layers.length > 0) {
        // Clear existing layers
        layersStore.layers.splice(0);
        // Add loaded layers
        project.layers.forEach(layer => {
          layersStore.layers.push(layer);
        });
      }

      lastSaved.value = new Date(project.updated);
    } catch (error) {
      console.error('Failed to load project:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  // Export project as ZIP
  async function exportAsZip() {
    if (!projectId.value) return;

    try {
      const { fileSave } = await import('browser-fs-access');
      const JSZip = (await import('jszip')).default;
      
      // Get project data
      const exportData = await exportProjectFromDB(projectId.value);
      
      // Create ZIP
      const zip = new JSZip();
      
      // Add project.json
      zip.file('project.json', JSON.stringify(exportData, null, 2));
      
      // Add assets as separate files
      if (exportData.assets && exportData.assets.length > 0) {
        const assetsFolder = zip.folder('assets');
        
        for (const asset of exportData.assets) {
          // Extract base64 data
          const base64Data = asset.data.split(',')[1];
          const binaryData = atob(base64Data);
          const bytes = new Uint8Array(binaryData.length);
          
          for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i);
          }
          
          // Determine file extension
          const ext = asset.type.split('/')[1] || 'bin';
          const filename = `${asset.id}.${ext}`;
          
          assetsFolder.file(filename, bytes);
        }
      }
      
      // Generate ZIP blob
      const blob = await zip.generateAsync({ type: 'blob' });
      
      // Save file
      await fileSave(blob, {
        fileName: `${projectName.value || 'project'}.lumencanvas.zip`,
        extensions: ['.zip'],
        description: 'LumenCanvas Project',
      });
      
      return true;
    } catch (error) {
      console.error('Failed to export project:', error);
      throw error;
    }
  }

  // Import project from ZIP
  async function importFromZip() {
    try {
      const { fileOpen } = await import('browser-fs-access');
      const JSZip = (await import('jszip')).default;
      
      // Open file
      const file = await fileOpen({
        extensions: ['.zip'],
        description: 'LumenCanvas Project',
        multiple: false,
      });
      
      // Read ZIP
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      // Extract project.json
      const projectFile = contents.file('project.json');
      if (!projectFile) {
        throw new Error('Invalid project file: missing project.json');
      }
      
      const projectText = await projectFile.async('string');
      const projectData = JSON.parse(projectText);
      
      // Import assets
      const assetsFolder = contents.folder('assets');
      if (assetsFolder) {
        const assetFiles = Object.keys(contents.files)
          .filter(path => path.startsWith('assets/') && !contents.files[path].dir);
        
        for (const assetPath of assetFiles) {
          const assetFile = contents.file(assetPath);
          const assetData = await assetFile.async('blob');
          
          // Find corresponding asset metadata
          const assetId = assetPath.split('/')[1].split('.')[0];
          const assetMeta = projectData.assets.find(a => a.id === assetId);
          
          if (assetMeta) {
            // Update asset data with new blob
            const reader = new FileReader();
            const base64 = await new Promise((resolve, reject) => {
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(assetData);
            });
            
            assetMeta.data = base64;
          }
        }
      }
      
      // Import the project
      const { importProject } = await import('../services/storage');
      const imported = await importProject(projectData);
      
      // Load the imported project
      await loadProject(imported.id);
      
      return imported;
    } catch (error) {
      console.error('Failed to import project:', error);
      throw error;
    }
  }

  // Handle asset uploads
  async function uploadAsset(file, layerId) {
    if (!projectId.value) return null;
    
    try {
      const asset = await saveBlobAsset(projectId.value, file, {
        name: file.name,
        layerId: layerId
      });
      
      return asset;
    } catch (error) {
      console.error('Failed to upload asset:', error);
      throw error;
    }
  }

  // Update warp points
  function updateWarpPoints(points) {
    warpPoints.value = points;
  }

  // Watch for changes and trigger save
  let saveTimeout = null;
  watch(
    [projectName, projectDescription, warpPoints, () => layersStore.layers],
    () => {
      // Debounce saves
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(() => {
        if (projectId.value) {
          saveProject();
        }
      }, 1000);
    },
    { deep: true }
  );

  return {
    // State
    projectId,
    projectName,
    projectDescription,
    warpPoints,
    isSaving,
    lastSaved,
    isLoading,
    
    // Computed
    hasUnsavedChanges,
    projectData,
    
    // Actions
    initProject,
    saveProject,
    loadProject,
    exportAsZip,
    importFromZip,
    uploadAsset,
    updateWarpPoints,
  };
});