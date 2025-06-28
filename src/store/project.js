import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useLayersStore } from './layers';
import { useHistoryStore } from './history';
import { 
  saveProject as saveProjectToDB,
  getProject,
  enableAutoSave,
  exportProject as exportProjectFromDB,
  saveBlobAsset
} from '../services/storage';
import { projectSchema, validateProject, createEmptyProject } from '../schemas/projectSchema';

export const useProjectStore = defineStore('project', () => {
  // State
  const projectId = ref(null);
  const projectName = ref('Untitled Project');
  const projectDescription = ref('');
  const canvasWidth = ref(800);
  const canvasHeight = ref(600);
  const blendMode = ref('normal');
  const warpPoints = ref([
    { x: 200, y: 150 },  // top-left
    { x: 600, y: 150 },  // top-right
    { x: 600, y: 450 },  // bottom-right
    { x: 200, y: 450 },  // bottom-left
  ]);
  const isSaving = ref(false);
  const lastSaved = ref(null);
  const isLoading = ref(false);
  // Flag to track if a file picker is currently active
  const filePickerActive = ref(false);

  // Get layers store
  const layersStore = useLayersStore();
  const historyStore = useHistoryStore();

  // Computed
  const hasUnsavedChanges = computed(() => {
    // In a real app, we'd track actual changes
    return false; // For now, auto-save handles everything
  });

  const projectData = computed(() => ({
    version: '1.0',
    id: projectId.value,
    metadata: {
      id: projectId.value,
      name: projectName.value,
      description: projectDescription.value,
      created: projectId.value ? undefined : new Date().toISOString(),
      modified: new Date().toISOString(),
      author: '',
    },
    canvas: {
      width: canvasWidth.value,
      height: canvasHeight.value,
      background: '#000000', // Default black background
      blendMode: blendMode.value,
    },
    layers: layersStore.layers,
    assets: [], // Assets would be loaded from storage
    history: {
      commands: [], // We don't save command history to DB
      currentIndex: -1,
    }
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

  // Helper to deeply clone and sanitize project data for IndexedDB
  function sanitizeForIndexedDB(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeForIndexedDB);
    if (obj instanceof Date) return obj.toISOString();
    // Remove non-plain objects (functions, DOM nodes, etc.)
    const plain = {};
    for (const key in obj) {
      const val = obj[key];
      if (typeof val === 'function') continue;
      if (val && typeof val === 'object' && (val.__v_isRef || val.__v_isReactive)) continue;
      plain[key] = sanitizeForIndexedDB(val);
    }
    return plain;
  }

  // Save project
  async function saveProject() {
    if (!projectId.value) return;
    
    isSaving.value = true;
    try {
      const sanitized = sanitizeForIndexedDB(projectData.value);
      await saveProjectToDB(sanitized);
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

      // Validate project structure
      const validation = validateProject(project);
      if (!validation.valid) {
        console.warn('Project validation warnings:', validation.errors);
      }

      // Load project metadata - use top-level id as primary source
      projectId.value = project.id || project.metadata?.id;
      projectName.value = project.metadata?.name || project.name || 'Untitled Project';
      projectDescription.value = project.metadata?.description || project.description || '';
      
      // Load canvas settings
      canvasWidth.value = project.canvas?.width || project.canvasWidth || 800;
      canvasHeight.value = project.canvas?.height || project.canvasHeight || 600;
      blendMode.value = project.canvas?.blendMode || project.blendMode || 'normal';
      
      // Load warp points (legacy support)
      if (project.warpPoints) {
        warpPoints.value = project.warpPoints;
      }

      // Load layers
      if (project.layers && project.layers.length > 0) {
        // Use new importLayers method
        layersStore.importLayers(project.layers);
      }

      // Clear history
      historyStore.clear();

      lastSaved.value = new Date(project.metadata?.modified || project.updated);
    } catch (error) {
      console.error('Failed to load project:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  // Export project as JSON
  function exportProjectAsJson() {
    return JSON.stringify(sanitizeForIndexedDB(projectData.value), null, 2);
  }

  // Import project from JSON
  async function importProjectFromJson(jsonString) {
    try {
      const projectData = JSON.parse(jsonString);
      
      // Validate project
      const validation = validateProject(projectData);
      if (!validation.valid) {
        console.warn('Project validation warnings:', validation.errors);
      }
      
      // Generate a new ID for the imported project
      const newId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Update project data with new ID
      projectData.id = newId; // Add top-level ID
      if (projectData.metadata) {
        projectData.metadata.id = newId;
      } else {
        projectData.metadata = { id: newId };
      }
      
      // Save to DB
      await saveProjectToDB(projectData);
      
      // Load the imported project
      await loadProject(newId);
      
      return newId;
    } catch (error) {
      console.error('Failed to import project from JSON:', error);
      throw error;
    }
  }

  // Export project as ZIP
  async function exportAsZip() {
    if (!projectId.value) return;
    
    // Check if a file picker is already active
    if (filePickerActive.value) {
      console.warn('A file operation is already in progress');
      return;
    }

    filePickerActive.value = true;
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
      if (error.name === 'NotAllowedError' && error.message.includes('File picker already active')) {
        console.warn('File picker is already active');
      } else if (error.name === 'AbortError') {
        console.log('Export cancelled by user');
      } else {
        console.error('Failed to export project:', error);
        throw error;
      }
    } finally {
      // Reset the flag when the operation is complete
      filePickerActive.value = false;
    }
  }

  // Import project from ZIP
  async function importFromZip() {
    // Check if a file picker is already active
    if (filePickerActive.value) {
      console.warn('A file operation is already in progress');
      return;
    }
    
    filePickerActive.value = true;
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
      if (error.name === 'NotAllowedError' && error.message.includes('File picker already active')) {
        console.warn('File picker is already active');
      } else if (error.name === 'AbortError') {
        console.log('Import cancelled by user');
      } else {
        console.error('Failed to import project:', error);
        throw error;
      }
    } finally {
      // Reset the flag when the operation is complete
      filePickerActive.value = false;
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

  // Create a new project
  function createNewProject(options = {}) {
    const newProject = createEmptyProject(options);
    
    // Update store with new project data
    projectId.value = newProject.metadata.id;
    projectName.value = newProject.metadata.name;
    projectDescription.value = newProject.metadata.description;
    canvasWidth.value = newProject.canvas.width;
    canvasHeight.value = newProject.canvas.height;
    blendMode.value = newProject.canvas.blendMode;
    
    // Clear layers
    layersStore.importLayers([]);
    
    // Clear history
    historyStore.clear();
    
    // Save the new project
    saveProject();
    
    return newProject.metadata.id;
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
    canvasWidth,
    canvasHeight,
    blendMode,
    warpPoints,
    isSaving,
    lastSaved,
    isLoading,
    filePickerActive,
    
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
    createNewProject,
    exportProjectAsJson,
    importProjectFromJson,
  };
});