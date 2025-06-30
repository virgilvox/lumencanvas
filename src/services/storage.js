import { openDB } from 'idb';

const DB_NAME = 'lumencanvas';
const DB_VERSION = 2;
const PROJECT_STORE = 'projects';
const ASSETS_STORE = 'assets';

// Storage providers
const STORAGE_PROVIDERS = {
  INDEXEDDB: 'indexeddb',
  NETLIFY: 'netlify',
  MINIO: 'minio',
  CUSTOM: 'custom'
};

// Default storage provider
let currentProvider = STORAGE_PROVIDERS.INDEXEDDB;

let db = null;

function sanitizeForIndexedDB(obj, path = '', visited = new Set()) {
  if (obj === null || typeof obj === 'undefined') return null;
  
  // Handle primitive types
  if (typeof obj !== 'object' && typeof obj !== 'function') return obj;
  
  // Handle functions
  if (typeof obj === 'function') {
    console.warn('Stripped function at', path);
    return undefined;
  }
  
  // Handle special objects
  if (obj instanceof Blob || obj instanceof File) {
    console.warn('Stripped Blob/File at', path);
    return undefined;
  }
  
  if (obj instanceof Date) return obj.toISOString();
  
  // Check for circular references
  if (visited.has(obj)) {
    console.warn('Stripped circular reference at', path);
    return undefined;
  }
  
  // Add this object to visited set
  visited.add(obj);
  
  // Check for non-serializable objects
  const proto = Object.prototype.toString.call(obj);
  if (
    proto === '[object Window]' ||
    proto === '[object HTMLElement]' ||
    proto === '[object Document]' ||
    proto === '[object Event]' ||
    proto === '[object WebGLRenderingContext]' ||
    proto === '[object WebGL2RenderingContext]' ||
    proto === '[object CanvasRenderingContext2D]' ||
    (typeof obj._isVue === 'boolean') ||
    (obj.constructor && obj.constructor.name && (
      obj.constructor.name.startsWith('Ref') ||
      obj.constructor.name.startsWith('Reactive') ||
      obj.constructor.name.startsWith('PIXI') ||
      obj.constructor.name.includes('Observer') ||
      obj.constructor.name.includes('Proxy')
    ))
  ) {
    console.warn('Stripped non-serializable object at', path, obj.constructor ? obj.constructor.name : proto);
    return undefined;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    const result = obj.map((item, i) => sanitizeForIndexedDB(item, path + '[' + i + ']', new Set(visited)))
      .filter(item => item !== undefined);
    visited.delete(obj);
    return result;
  }
  
  // Handle plain objects
  const clean = {};
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    
    // Skip properties that are likely to cause issues
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    
    try {
      const val = sanitizeForIndexedDB(obj[key], path ? path + '.' + key : key, new Set(visited));
      if (typeof val !== 'undefined') clean[key] = val;
    } catch (err) {
      console.warn('Error sanitizing property', key, 'at', path, err);
    }
  }
  
  visited.delete(obj);
  return clean;
}

// Initialize the database
async function initDB() {
  if (db) return db;
  
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
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
  
  // Make sure project has a top-level id (required for IndexedDB key path)
  if (!project.id && project.metadata && project.metadata.id) {
    project.id = project.metadata.id;
  }
  
  // Ensure we have an id
  if (!project.id) {
    project.id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (project.metadata) {
      project.metadata.id = project.id;
    } else {
      project.metadata = { id: project.id };
    }
  }
  
  // Sanitize before saving
  const sanitized = sanitizeForIndexedDB(project);
  
  await tx.objectStore(PROJECT_STORE).put(sanitized);
  await tx.done;
  
  return sanitized;
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
  data.project.id = newProjectId; // Set top-level ID
  if (data.project.metadata) {
    data.project.metadata.id = newProjectId;
  } else {
    data.project.metadata = { id: newProjectId };
  }
  
  data.project.name = `${data.project.name || 'Imported Project'} (Imported)`;
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
let logAutoSave = false; // Flag to control auto-save logging

export function enableAutoSave(getProjectData, interval = 5000) {
  const doAutoSave = async () => {
    try {
      const projectData = getProjectData();
      if (projectData && projectData.id) {
        await saveProject(projectData);
        if (logAutoSave) {
          console.log('Auto-saved project:', projectData.id);
        }
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

// Storage Provider Management
export function setStorageProvider(provider) {
  if (Object.values(STORAGE_PROVIDERS).includes(provider)) {
    currentProvider = provider;
    return true;
  }
  return false;
}

export function getCurrentStorageProvider() {
  return currentProvider;
}

// Add the missing getAllAssets function
export async function getAllAssets() {
  const db = await initDB();
  return await db.getAll(ASSETS_STORE);
}

// Fix the deleteAsset function that was missing
export async function deleteAsset(id) {
  const db = await initDB();
  await db.delete(ASSETS_STORE, id);
}

// Fix the useStorageService function to include all necessary functions
export function useStorageService() {
  return {
    // Projects
    saveProject,
    getProject,
    getAllProjects,
    deleteProject,
    exportProject,
    importProject,
    
    // Assets
    saveAsset,
    getAsset,
    getProjectAssets,
    getAllAssets,
    deleteAsset,
    saveBlobAsset,
    
    // Auto-save
    enableAutoSave,
    
    // Provider management
    setStorageProvider,
    getCurrentStorageProvider,
    STORAGE_PROVIDERS
  };
}

// Initialize DB on import
initDB().catch(console.error);