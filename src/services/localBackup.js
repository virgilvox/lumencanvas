/**
 * Local Storage Backup Service
 * Provides backup and recovery of projects using browser's localStorage
 */

// Constants
const BACKUP_PREFIX = 'lumencanvas_backup_';
const BACKUP_INDEX = 'lumencanvas_backup_index';
const MAX_BACKUPS = 10; // Maximum number of backups to keep per project

// Helper to safely stringify objects for storage
function safeStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.error('Failed to stringify object for backup:', error);
    return null;
  }
}

// Helper to safely parse stored JSON
function safeParse(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error('Failed to parse backup data:', error);
    return null;
  }
}

/**
 * Create a backup of a project in localStorage
 * @param {Object} project - Project to backup
 * @returns {boolean} Success status
 */
export function createBackup(project) {
  if (!project || !project.id) return false;
  
  try {
    const projectId = project.id;
    const timestamp = Date.now();
    const backupKey = `${BACKUP_PREFIX}${projectId}_${timestamp}`;
    
    // Sanitize project for storage (remove circular references, etc.)
    const sanitizedProject = sanitizeForStorage(project);
    if (!sanitizedProject) return false;
    
    // Store the backup
    localStorage.setItem(backupKey, safeStringify(sanitizedProject));
    
    // Update backup index
    updateBackupIndex(projectId, timestamp);
    
    // Prune old backups
    pruneOldBackups(projectId);
    
    return true;
  } catch (error) {
    console.error('Failed to create backup:', error);
    return false;
  }
}

/**
 * Get all backups for a project
 * @param {string} projectId - Project ID
 * @returns {Array} Array of backup metadata objects with timestamps
 */
export function getBackups(projectId) {
  if (!projectId) return [];
  
  try {
    // Get backup index
    const indexData = safeParse(localStorage.getItem(BACKUP_INDEX)) || {};
    const projectBackups = indexData[projectId] || [];
    
    // Sort by timestamp (newest first)
    return projectBackups.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to get backups:', error);
    return [];
  }
}

/**
 * Restore a project from backup
 * @param {string} projectId - Project ID
 * @param {number} timestamp - Backup timestamp
 * @returns {Object|null} Restored project or null if backup not found
 */
export function restoreBackup(projectId, timestamp) {
  if (!projectId || !timestamp) return null;
  
  try {
    const backupKey = `${BACKUP_PREFIX}${projectId}_${timestamp}`;
    const backupData = localStorage.getItem(backupKey);
    
    if (!backupData) return null;
    
    const restoredProject = safeParse(backupData);
    
    // Ensure the project has a valid structure
    if (!restoredProject) return null;
    
    // Perform deep validation and fix common issues
    
    // 1. Ensure ID exists
    if (!restoredProject.id && (!restoredProject.metadata || !restoredProject.metadata.id)) {
      restoredProject.id = projectId;
      if (restoredProject.metadata) {
        restoredProject.metadata.id = projectId;
      } else {
        restoredProject.metadata = { id: projectId };
      }
      console.warn('Fixed missing project ID in restored project');
    }
    
    // 2. Ensure layers is always an array
    if (!Array.isArray(restoredProject.layers)) {
      restoredProject.layers = [];
      console.warn('Fixed missing layers array in restored project');
    }
    
    // 3. Ensure canvas exists
    if (!restoredProject.canvas) {
      restoredProject.canvas = {
        width: restoredProject.canvasWidth || 800,
        height: restoredProject.canvasHeight || 600,
        background: '#000000',
        blendMode: restoredProject.blendMode || 'normal'
      };
      console.warn('Fixed missing canvas object in restored project');
    }
    
    // 4. Ensure metadata exists
    if (!restoredProject.metadata) {
      restoredProject.metadata = {
        id: restoredProject.id || projectId,
        name: restoredProject.name || 'Restored Project',
        description: restoredProject.description || '',
        modified: new Date().toISOString()
      };
      console.warn('Fixed missing metadata in restored project');
    }
    
    return restoredProject;
  } catch (error) {
    console.error('Failed to restore backup:', error);
    return null;
  }
}

/**
 * Delete a specific backup
 * @param {string} projectId - Project ID
 * @param {number} timestamp - Backup timestamp
 * @returns {boolean} Success status
 */
export function deleteBackup(projectId, timestamp) {
  if (!projectId || !timestamp) return false;
  
  try {
    const backupKey = `${BACKUP_PREFIX}${projectId}_${timestamp}`;
    
    // Remove the backup
    localStorage.removeItem(backupKey);
    
    // Update backup index
    const indexData = safeParse(localStorage.getItem(BACKUP_INDEX)) || {};
    const projectBackups = indexData[projectId] || [];
    
    indexData[projectId] = projectBackups.filter(backup => backup.timestamp !== timestamp);
    localStorage.setItem(BACKUP_INDEX, safeStringify(indexData));
    
    return true;
  } catch (error) {
    console.error('Failed to delete backup:', error);
    return false;
  }
}

/**
 * Delete all backups for a project
 * @param {string} projectId - Project ID
 * @returns {boolean} Success status
 */
export function deleteAllBackups(projectId) {
  if (!projectId) return false;
  
  try {
    // Get backup index
    const indexData = safeParse(localStorage.getItem(BACKUP_INDEX)) || {};
    const projectBackups = indexData[projectId] || [];
    
    // Remove all backups
    for (const backup of projectBackups) {
      const backupKey = `${BACKUP_PREFIX}${projectId}_${backup.timestamp}`;
      localStorage.removeItem(backupKey);
    }
    
    // Update backup index
    delete indexData[projectId];
    localStorage.setItem(BACKUP_INDEX, safeStringify(indexData));
    
    return true;
  } catch (error) {
    console.error('Failed to delete all backups:', error);
    return false;
  }
}

/**
 * Check if local storage is available
 * @returns {boolean} True if localStorage is available
 */
export function isLocalStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get total size of all backups in bytes
 * @returns {number} Size in bytes
 */
export function getBackupSize() {
  try {
    let totalSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(BACKUP_PREFIX)) {
        const value = localStorage.getItem(key);
        totalSize += key.length + value.length;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Failed to calculate backup size:', error);
    return 0;
  }
}

// Helper to sanitize project for storage
function sanitizeForStorage(project) {
  if (!project) return null;
  
  try {
    // Create a deep copy without circular references
    const copy = JSON.parse(JSON.stringify(project));
    
    // Remove potentially problematic properties
    if (copy.history) {
      delete copy.history.commands;
    }
    
    return copy;
  } catch (error) {
    console.error('Failed to sanitize project for storage:', error);
    return null;
  }
}

// Helper to update backup index
function updateBackupIndex(projectId, timestamp) {
  const indexData = safeParse(localStorage.getItem(BACKUP_INDEX)) || {};
  const projectBackups = indexData[projectId] || [];
  
  // Add new backup to index
  projectBackups.push({
    timestamp,
    date: new Date().toISOString()
  });
  
  // Update index
  indexData[projectId] = projectBackups;
  localStorage.setItem(BACKUP_INDEX, safeStringify(indexData));
}

// Helper to prune old backups
function pruneOldBackups(projectId) {
  const indexData = safeParse(localStorage.getItem(BACKUP_INDEX)) || {};
  const projectBackups = indexData[projectId] || [];
  
  // Sort by timestamp (newest first)
  projectBackups.sort((a, b) => b.timestamp - a.timestamp);
  
  // Remove old backups
  if (projectBackups.length > MAX_BACKUPS) {
    const backupsToRemove = projectBackups.slice(MAX_BACKUPS);
    
    for (const backup of backupsToRemove) {
      const backupKey = `${BACKUP_PREFIX}${projectId}_${backup.timestamp}`;
      localStorage.removeItem(backupKey);
    }
    
    // Update index
    indexData[projectId] = projectBackups.slice(0, MAX_BACKUPS);
    localStorage.setItem(BACKUP_INDEX, safeStringify(indexData));
  }
}

export default {
  createBackup,
  getBackups,
  restoreBackup,
  deleteBackup,
  deleteAllBackups,
  isLocalStorageAvailable,
  getBackupSize
}; 