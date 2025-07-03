import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useLayersStore } from './layers';
import { useHistoryStore } from './history';
import { 
  saveProject as saveProjectToDB,
  getProject as getProjectFromDB,
  enableAutoSave,
  exportProject as exportProjectFromDB,
  saveBlobAsset
} from '../services/storage';
import { projectSchema, validateProject, createEmptyProject } from '../schemas/projectSchema';
import localBackup from '../services/localBackup';
import api from '../services/api';

export const useProjectStore = defineStore('project', () => {
  // State
  const projectId = ref(null);
  const projectName = ref('Untitled Project');
  const projectDescription = ref('');
  const canvasWidth = ref(800);
  const canvasHeight = ref(600);
  const canvasBackground = ref('#000000');
  const blendMode = ref('normal');
  const warpPoints = ref([
    { x: 200, y: 150 },  // top-left
    { x: 600, y: 150 },  // top-right
    { x: 600, y: 450 },  // bottom-right
    { x: 200, y: 450 },  // bottom-left
  ]);
  const assets = ref([]);
  const isSaving = ref(false);
  const lastSaved = ref(null);
  const isLoading = ref(false);
  const backupEnabled = ref(true);
  const cloudSyncEnabled = ref(false);
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
      background: canvasBackground.value, // Use the canvasBackground ref
      blendMode: blendMode.value,
    },
    layers: layersStore.layers,
    assets: assets.value,
    history: {
      commands: [], // We don't save command history to DB
      currentIndex: -1,
    }
  }));

  // Initialize project
  async function initProject() {
    isLoading.value = true;
    try {
      // For now, we'll just create a new project on init.
      // A real implementation would check for a last-opened project ID.
      await createNewProject({ name: 'New Project' });
    } catch (error) {
      console.error("Failed to initialize project:", error);
    } finally {
      isLoading.value = false;
    }
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

  function setCurrentProjectData(project) {
    if (!project || !project.id) {
      console.error("setCurrentProjectData called with invalid project data");
      return;
    }
    
    // Directly set the store's state from the provided project object
    projectId.value = project.id;
    projectName.value = project.metadata.name;
    projectDescription.value = project.metadata.description;
    canvasWidth.value = project.canvas.width;
    canvasHeight.value = project.canvas.height;
    canvasBackground.value = project.canvas.background;
    assets.value = project.assets || [];
    layersStore.importLayers(project.layers || []);
    historyStore.clear();
    
    lastSaved.value = new Date(project.metadata.modified || Date.now());
    
    // Also save it locally to prime the cache
    saveProjectToDB(project);
  }

  // Save project
  async function saveProject() {
    if (!projectId.value) return;
    
    isSaving.value = true;
    try {
      const dataToSave = projectData.value;
      // Local save first for speed
      await saveProjectToDB(dataToSave);
      
      // Then sync with the server
      await api.projects.update(dataToSave);

      lastSaved.value = new Date();
    } catch (error) {
      console.error('Failed to save project:', error);
      // Implement a more robust error handling/retry mechanism here
    } finally {
      isSaving.value = false;
    }
  }

  // Load project
  async function loadProject(id, initialData = null) {
    if (projectId.value === id && !initialData) {
      console.log(`Project ${id} is already loaded and no new initial data provided.`);
      return;
    }

    isLoading.value = true;
    
    // If initial data is provided, use it immediately
    if (initialData) {
      setCurrentProjectData(initialData);
      isLoading.value = false;
      return;
    }
    
    try {
      const project = await api.projects.get(id);
      if (!project) throw new Error('Project not found on server');
      
      // Update local store with data from server
      projectId.value = project.id;
      projectName.value = project.name;
      projectDescription.value = project.description;
      canvasWidth.value = project.canvas.width;
      canvasHeight.value = project.canvas.height;
      canvasBackground.value = project.canvas.background;
      assets.value = project.assets || [];
      layersStore.importLayers(project.layers || []);
      historyStore.clear();
      
      // Cache the loaded project locally
      await saveProjectToDB(project);
      
      lastSaved.value = new Date(project.updatedAt || Date.now());

    } catch (error) {
      console.error('Failed to load project from server, trying local cache:', error);
      // Fallback to local DB if server fails
      const localProject = await getProjectFromDB(id);
      if (localProject) {
          // ... load from localProject ...
          console.log("Loaded project from local cache.");
      } else {
          console.error(`Project ${id} not found locally either.`);
      }
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
    // This now needs to fetch all assets from S3, which can be complex.
    // For now, let's export just the project.json
    if (!projectId.value) return;

    try {
        const { fileSave } = await import('browser-fs-access');
        const projectJson = JSON.stringify(projectData.value, null, 2);
        const blob = new Blob([projectJson], { type: 'application/json' });
        
        await fileSave(blob, {
            fileName: `${projectName.value || 'project'}.json`,
            extensions: ['.json'],
        });
    } catch(error) {
        console.error("Export failed:", error);
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
  async function createNewProject(options = {}) {
    const newProjectData = createEmptyProject(options);
    try {
      const newProject = await api.projects.create(newProjectData);
      await loadProject(newProject.id);
      return newProject.id;
    } catch(error) {
      console.error("Failed to create new project on the server, saving locally.", error);
      // Fallback to local-only project if API fails
      const localId = `local_${Date.now()}`;
      newProjectData.id = localId;
      await saveProjectToDB(newProjectData);
      await loadProject(localId);
      return localId;
    }
  }

  // Get project backups
  function getProjectBackups() {
    if (!projectId.value || !localBackup.isLocalStorageAvailable()) {
      return [];
    }
    
    return localBackup.getBackups(projectId.value);
  }

  // Restore project from backup
  async function restoreFromBackup(timestamp) {
    if (!projectId.value || !timestamp) return false;
    
    try {
      const backup = localBackup.restoreBackup(projectId.value, timestamp);
      if (!backup) return false;
      
      // Additional validation to ensure backup has required properties
      if (!backup.id && !backup.metadata?.id) {
        console.error('Invalid backup: missing project ID');
        return false;
      }
      
      // Ensure layers is always an array before loading
      if (!Array.isArray(backup.layers)) {
        backup.layers = [];
        console.warn('Fixed missing layers array in backup before loading');
      }
      
      // Create a sanitized version of the backup to ensure all required fields are present
      const sanitizedBackup = {
        ...backup,
        id: backup.id || backup.metadata?.id,
        metadata: backup.metadata || {
          id: backup.id,
          name: backup.name || 'Restored Project',
          description: backup.description || '',
          modified: backup.modified || new Date().toISOString()
        },
        canvas: backup.canvas || {
          width: backup.canvasWidth || 800,
          height: backup.canvasHeight || 600,
          background: '#000000',
          blendMode: backup.blendMode || 'normal'
        },
        layers: Array.isArray(backup.layers) ? backup.layers : []
      };
      
      // Save the sanitized backup to ensure it's properly structured
      await saveProjectToDB(sanitizedBackup);
      
      // Load the backup data
      await loadProject(sanitizedBackup.id);
      
      return true;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }

  // Toggle backup enabled
  function toggleBackup(enabled) {
    backupEnabled.value = enabled;
  }

  // Toggle cloud sync enabled
  function toggleCloudSync(enabled) {
    cloudSyncEnabled.value = enabled;
  }

  // Set canvas size
  function setCanvasSize(width, height) {
    canvasWidth.value = width;
    canvasHeight.value = height;
    saveProject();
  }

  // Set canvas background
  function setCanvasBackground(color) {
    canvasBackground.value = color;
    saveProject();
  }

  // Set project name
  function setName(name) {
    projectName.value = name;
    saveProject();
  }

  // Set project description
  function setDescription(description) {
    projectDescription.value = description;
    saveProject();
  }

  // Watch for changes and trigger save
  let saveTimeout = null;
  watch(
    [projectName, projectDescription, warpPoints, () => layersStore.layers, () => assets.value],
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

  // Set file picker active state
  function setFilePickerActive(active) {
    filePickerActive.value = active;
  }

  function addAsset(asset) {
      const existing = assets.value.find(a => a.id === asset.id);
      if (!existing) {
          assets.value.push(asset);
          // Trigger a save since assets list has changed
          saveProject();
      }
  }

  return {
    // State
    projectId,
    projectName,
    projectDescription,
    canvasWidth,
    canvasHeight,
    canvasBackground,
    blendMode,
    warpPoints,
    assets,
    isSaving,
    lastSaved,
    isLoading,
    filePickerActive,
    backupEnabled,
    cloudSyncEnabled,
    
    // Computed
    hasUnsavedChanges,
    projectData,
    
    // Actions
    initProject,
    saveProject,
    loadProject,
    setCurrentProjectData,
    exportAsZip,
    importFromZip,
    uploadAsset,
    updateWarpPoints,
    createNewProject,
    exportProjectAsJson,
    importProjectFromJson,
    getProjectBackups,
    restoreFromBackup,
    toggleBackup,
    toggleCloudSync,
    setFilePickerActive,
    setCanvasSize,
    setCanvasBackground,
    setName,
    setDescription,
    addAsset
  };
});