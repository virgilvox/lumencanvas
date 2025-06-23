import { openDB } from 'idb';

const DB_NAME = 'lumencanvas';
const DB_VERSION = 1;
const PROJECT_STORE = 'projects';
const ASSETS_STORE = 'assets';

let db = null;

// Initialize the database
async function initDB() {
  if (db) return db;
  
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create projects store
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        const projectStore = db.createObjectStore(PROJECT_STORE, { 
          keyPath: 'id',
          autoIncrement: false 
        });
        projectStore.createIndex('updated', 'updated');
      }
      
      // Create assets store
      if (!db.objectStoreNames.contains(ASSETS_STORE)) {
        const assetStore = db.createObjectStore(ASSETS_STORE, { 
          keyPath: 'id',
          autoIncrement: false 
        });
        assetStore.createIndex('projectId', 'projectId');
      }
    }
  });
  
  return db;
}

// Project operations
export async function saveProject(project) {
  const db = await initDB();
  const tx = db.transaction(PROJECT_STORE, 'readwrite');
  
  // Add timestamp
  project.updated = new Date().toISOString();
  
  await tx.objectStore(PROJECT_STORE).put(project);
  await tx.done;
  
  return project;
}

export async function getProject(id) {
  const db = await initDB();
  return await db.get(PROJECT_STORE, id);
}

export async function getAllProjects() {
  const db = await initDB();
  return await db.getAll(PROJECT_STORE);
}

export async function deleteProject(id) {
  const db = await initDB();
  const tx = db.transaction([PROJECT_STORE, ASSETS_STORE], 'readwrite');
  
  // Delete project
  await tx.objectStore(PROJECT_STORE).delete(id);
  
  // Delete associated assets
  const assetStore = tx.objectStore(ASSETS_STORE);
  const assetIndex = assetStore.index('projectId');
  const assets = await assetIndex.getAllKeys(id);
  
  for (const assetId of assets) {
    await assetStore.delete(assetId);
  }
  
  await tx.done;
}

// Asset operations
export async function saveAsset(asset) {
  const db = await initDB();
  await db.put(ASSETS_STORE, asset);
  return asset;
}

export async function getAsset(id) {
  const db = await initDB();
  return await db.get(ASSETS_STORE, id);
}

export async function getProjectAssets(projectId) {
  const db = await initDB();
  const tx = db.transaction(ASSETS_STORE, 'readonly');
  const index = tx.objectStore(ASSETS_STORE).index('projectId');
  return await index.getAll(projectId);
}

// Blob handling
export async function saveBlobAsset(projectId, blob, metadata = {}) {
  const id = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Convert blob to base64 for storage
  const reader = new FileReader();
  const base64 = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  
  const asset = {
    id,
    projectId,
    data: base64,
    type: blob.type,
    size: blob.size,
    ...metadata,
    created: new Date().toISOString()
  };
  
  await saveAsset(asset);
  return asset;
}

// Export/Import functionality
export async function exportProject(projectId) {
  const project = await getProject(projectId);
  if (!project) throw new Error('Project not found');
  
  const assets = await getProjectAssets(projectId);
  
  return {
    version: '1.0',
    exported: new Date().toISOString(),
    project,
    assets
  };
}

export async function importProject(data) {
  if (!data.version || !data.project) {
    throw new Error('Invalid project data');
  }
  
  // Generate new ID for imported project
  const newProjectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const oldProjectId = data.project.id;
  
  // Update project ID
  data.project.id = newProjectId;
  data.project.name = `${data.project.name} (Imported)`;
  data.project.imported = new Date().toISOString();
  
  // Save project
  await saveProject(data.project);
  
  // Import assets with new project ID
  if (data.assets && data.assets.length > 0) {
    for (const asset of data.assets) {
      asset.projectId = newProjectId;
      await saveAsset(asset);
    }
  }
  
  return data.project;
}

// Auto-save functionality
let autoSaveTimeout = null;

export function enableAutoSave(getProjectData, interval = 5000) {
  const doAutoSave = async () => {
    try {
      const projectData = getProjectData();
      if (projectData && projectData.id) {
        await saveProject(projectData);
        console.log('Auto-saved project:', projectData.id);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };
  
  // Clear existing timeout
  if (autoSaveTimeout) {
    clearInterval(autoSaveTimeout);
  }
  
  // Set up new interval
  autoSaveTimeout = setInterval(doAutoSave, interval);
  
  // Return cleanup function
  return () => {
    if (autoSaveTimeout) {
      clearInterval(autoSaveTimeout);
      autoSaveTimeout = null;
    }
  };
}

// Initialize DB on import
initDB().catch(console.error);