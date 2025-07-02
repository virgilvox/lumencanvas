/**
 * Local IndexedDB Backup Service
 * Provides backup and recovery of projects using browser's IndexedDB
 */
import { openDB } from 'idb';

const DB_NAME = 'lumencanvas';
const BACKUP_STORE = 'backups';
const MAX_BACKUPS = 10; // Maximum number of backups to keep per project

// Helper to get the database instance
async function getDB() {
  // We can re-use the init logic from storage.js, but to keep this module
  // self-contained for backups, we can define a minimal version here.
  return openDB(DB_NAME, 2); // Version must match storage.js
}

/**
 * Create a backup of a project in IndexedDB
 * @param {Object} project - Project to backup
 * @returns {boolean} Success status
 */
export async function createBackup(project) {
  if (!project || !project.id) return false;
  
  try {
    const db = await getDB();
    const backupData = {
      projectId: project.id,
      timestamp: Date.now(),
      date: new Date().toISOString(),
      projectData: JSON.parse(JSON.stringify(project)) // Deep clone
    };
    
    await db.put(BACKUP_STORE, backupData);
    
    // Prune old backups
    await pruneOldBackups(project.id);
    
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
export async function getBackups(projectId) {
  if (!projectId) return [];
  
  try {
    const db = await getDB();
    const backups = await db.getAllFromIndex(BACKUP_STORE, 'projectId', projectId);
    // Sort by timestamp (newest first)
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to get backups:', error);
    return [];
  }
}

/**
 * Restore a project from backup
 * @param {number} timestamp - Backup timestamp
 * @returns {Object|null} Restored project data or null if not found
 */
export async function restoreBackup(timestamp) {
  if (!timestamp) return null;
  
  try {
    const db = await getDB();
    const backup = await db.get(BACKUP_STORE, timestamp);
    return backup ? backup.projectData : null;
  } catch (error) {
    console.error('Failed to restore backup:', error);
    return null;
  }
}

/**
 * Delete a specific backup
 * @param {number} timestamp - Backup timestamp
 * @returns {boolean} Success status
 */
export async function deleteBackup(timestamp) {
  if (!timestamp) return false;
  
  try {
    const db = await getDB();
    await db.delete(BACKUP_STORE, timestamp);
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
export async function deleteAllBackups(projectId) {
  if (!projectId) return false;
  
  try {
    const db = await getDB();
    const backups = await db.getAllFromIndex(BACKUP_STORE, 'projectId', projectId);
    const tx = db.transaction(BACKUP_STORE, 'readwrite');
    await Promise.all(backups.map(backup => tx.store.delete(backup.timestamp)));
    await tx.done;
    return true;
  } catch (error) {
    console.error('Failed to delete all backups for project:', error);
    return false;
  }
}

/**
 * Get storage usage and quota information
 * @returns {Promise<Object>} Object with used, total, and percentUsed
 */
export async function getStorageInfo() {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        available: true,
        used: estimate.usage,
        total: estimate.quota,
        percentUsed: (estimate.usage / estimate.quota) * 100,
      };
    } catch (error) {
      console.warn('Could not estimate storage quota:', error);
    }
  }
  return { available: false, used: 0, total: 0, percentUsed: 0 };
}

/**
 * Prune old backups for a project if they exceed the limit
 * @param {string} projectId - Project ID
 */
async function pruneOldBackups(projectId) {
  try {
    const db = await getDB();
    const allBackups = await db.getAllFromIndex(BACKUP_STORE, 'projectId', projectId);
    
    if (allBackups.length > MAX_BACKUPS) {
      allBackups.sort((a, b) => a.timestamp - b.timestamp); // Sort oldest first
      const backupsToDelete = allBackups.slice(0, allBackups.length - MAX_BACKUPS);
      
      const tx = db.transaction(BACKUP_STORE, 'readwrite');
      await Promise.all(backupsToDelete.map(backup => tx.store.delete(backup.timestamp)));
      await tx.done;
    }
  } catch (error) {
    console.error('Failed to prune old backups:', error);
  }
}


export default {
  createBackup,
  getBackups,
  restoreBackup,
  deleteBackup,
  deleteAllBackups,
  getStorageInfo,
}; 