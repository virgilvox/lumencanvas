<template>
  <div class="backup-manager">
    <h3>Project Backups</h3>
    
    <div class="backup-settings">
      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            :checked="projectStore.backupEnabled" 
            @change="toggleBackup"
          />
          Enable local backups
        </label>
        <span class="help-text">Automatically save backups to browser storage</span>
      </div>
      
      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            :checked="projectStore.cloudSyncEnabled" 
            @change="toggleCloudSync"
          />
          Enable cloud sync
        </label>
        <span class="help-text">Sync projects with cloud storage</span>
      </div>
    </div>
    
    <div v-if="backups.length > 0" class="backup-list">
      <h4>Available Backups</h4>
      <div class="backup-item header">
        <div class="backup-date">Date</div>
        <div class="backup-actions">Actions</div>
      </div>
      
      <div 
        v-for="backup in backups" 
        :key="backup.timestamp" 
        class="backup-item"
      >
        <div class="backup-date">
          {{ formatDate(backup.date) }}
        </div>
        <div class="backup-actions">
          <button 
            class="btn btn-sm btn-primary" 
            @click="restoreBackup(backup.timestamp)"
            :disabled="isRestoring"
          >
            Restore
          </button>
          <button 
            class="btn btn-sm btn-danger" 
            @click="deleteBackup(backup.timestamp)"
            :disabled="isRestoring"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
    
    <div v-else class="no-backups">
      <p v-if="projectStore.backupEnabled">
        No backups available yet. Backups are created automatically as you work.
      </p>
      <p v-else>
        Local backups are disabled. Enable them above to automatically save backups to your browser.
      </p>
    </div>
    
    <div class="backup-actions">
      <button 
        class="btn btn-primary" 
        @click="createBackup"
        :disabled="isCreating || !projectStore.projectId"
      >
        Create Backup Now
      </button>
      <button 
        class="btn btn-danger" 
        @click="deleteAllBackups"
        :disabled="backups.length === 0 || isRestoring"
      >
        Delete All Backups
      </button>
    </div>
    
    <div v-if="storageInfo.available" class="storage-info">
      <div class="storage-usage">
        <div class="usage-bar">
          <div 
            class="usage-fill" 
            :style="{ width: `${storageInfo.percentUsed}%` }"
            :class="{ 'usage-warning': storageInfo.percentUsed > 70 }"
          ></div>
        </div>
        <div class="usage-text">
          {{ formatSize(storageInfo.used) }} of {{ formatSize(storageInfo.total) }} used
          ({{ storageInfo.percentUsed.toFixed(1) }}%)
        </div>
      </div>
    </div>
    
    <!-- Toast notification -->
    <Transition name="fade">
      <div v-if="showToast" class="toast" :class="toastType">
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useProjectStore } from '../store/project';
import localBackup from '../services/localBackup';

const projectStore = useProjectStore();

// State
const backups = ref([]);
const isRestoring = ref(false);
const isCreating = ref(false);
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref('info');
const storageInfo = ref({
  available: false,
  used: 0,
  total: 0,
  percentUsed: 0
});

// Load backups on mount
onMounted(() => {
  loadBackups();
  calculateStorageUsage();
});

// Load backups
async function loadBackups() {
  if (!projectStore.projectId) return;
  
  backups.value = await localBackup.getBackups(projectStore.projectId);
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date);
}

// Format file size
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Calculate storage usage
async function calculateStorageUsage() {
  storageInfo.value = await localBackup.getStorageInfo();
}

// Create backup
async function createBackup() {
  if (!projectStore.projectId) return;
  
  isCreating.value = true;
  try {
    const success = await localBackup.createBackup(projectStore.projectData);
    
    if (success) {
      showToastMessage('Backup created successfully', 'success');
      await loadBackups();
      await calculateStorageUsage();
    } else {
      showToastMessage('Failed to create backup', 'error');
    }
  } catch (error) {
    console.error('Failed to create backup:', error);
    showToastMessage('Failed to create backup', 'error');
  } finally {
    isCreating.value = false;
  }
}

// Restore backup
async function restoreBackup(timestamp) {
  if (!projectStore.projectId || !timestamp) return;
  
  if (!confirm('Are you sure you want to restore this backup? Any unsaved changes will be lost.')) {
    return;
  }
  
  isRestoring.value = true;
  try {
    const backupData = await localBackup.restoreBackup(timestamp);
    if (!backupData) {
      showToastMessage('Failed to load backup data', 'error');
      isRestoring.value = false;
      return;
    }

    // Pass the restored data to the project store
    const success = await projectStore.restoreFromBackup(backupData);
    
    if (success) {
      showToastMessage('Backup restored successfully', 'success');
    } else {
      showToastMessage('Failed to restore backup', 'error');
    }
  } catch (error) {
    console.error('Failed to restore backup:', error);
    showToastMessage('Failed to restore backup', 'error');
  } finally {
    isRestoring.value = false;
  }
}

// Delete backup
async function deleteBackup(timestamp) {
  if (!projectStore.projectId || !timestamp) return;
  
  if (!confirm('Are you sure you want to delete this backup?')) {
    return;
  }
  
  try {
    const success = await localBackup.deleteBackup(timestamp);
    
    if (success) {
      showToastMessage('Backup deleted successfully', 'success');
      await loadBackups();
      await calculateStorageUsage();
    } else {
      showToastMessage('Failed to delete backup', 'error');
    }
  } catch (error) {
    console.error('Failed to delete backup:', error);
    showToastMessage('Failed to delete backup', 'error');
  }
}

// Delete all backups
async function deleteAllBackups() {
  if (!projectStore.projectId) return;
  
  if (!confirm('Are you sure you want to delete all backups? This cannot be undone.')) {
    return;
  }
  
  try {
    const success = await localBackup.deleteAllBackups(projectStore.projectId);
    
    if (success) {
      showToastMessage('All backups deleted successfully', 'success');
      await loadBackups();
      await calculateStorageUsage();
    } else {
      showToastMessage('Failed to delete backups', 'error');
    }
  } catch (error) {
    console.error('Failed to delete backups:', error);
    showToastMessage('Failed to delete backups', 'error');
  }
}

// Toggle backup
function toggleBackup(event) {
  projectStore.toggleBackup(event.target.checked);
  showToastMessage(
    event.target.checked ? 'Local backups enabled' : 'Local backups disabled',
    'info'
  );
}

// Toggle cloud sync
function toggleCloudSync(event) {
  projectStore.toggleCloudSync(event.target.checked);
  showToastMessage(
    event.target.checked ? 'Cloud sync enabled' : 'Cloud sync disabled',
    'info'
  );
}

// Show toast message
function showToastMessage(message, type = 'info', duration = 3000) {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  
  setTimeout(() => {
    showToast.value = false;
  }, duration);
}
</script>

<style scoped>
.backup-manager {
  padding: 1rem;
  position: relative;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

h4 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.backup-settings {
  margin-bottom: 1.5rem;
  padding: 0.75rem;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.setting-group {
  margin-bottom: 0.5rem;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.help-text {
  display: block;
  font-size: 0.8rem;
  color: #666;
  margin-left: 1.5rem;
}

.backup-list {
  margin-bottom: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.backup-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #eee;
}

.backup-item:last-child {
  border-bottom: none;
}

.backup-item.header {
  background-color: #f5f5f5;
  font-weight: bold;
  font-size: 0.9rem;
}

.backup-date {
  flex: 1;
}

.backup-actions {
  display: flex;
  gap: 0.5rem;
}

.no-backups {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 4px;
  text-align: center;
  color: #666;
}

.backup-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.storage-info {
  margin-top: 1rem;
}

.storage-usage {
  margin-top: 0.5rem;
}

.usage-bar {
  height: 8px;
  background-color: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.usage-fill {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.usage-fill.usage-warning {
  background-color: #ff9800;
}

.usage-text {
  font-size: 0.8rem;
  color: #666;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}

.btn-primary {
  background-color: #2196f3;
  color: white;
}

.btn-primary:hover {
  background-color: #0b7dda;
}

.btn-danger {
  background-color: #f44336;
  color: white;
}

.btn-danger:hover {
  background-color: #d32f2f;
}

.btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* Toast notification */
.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  color: white;
  font-size: 0.9rem;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.toast.success {
  background-color: #4caf50;
}

.toast.error {
  background-color: #f44336;
}

.toast.info {
  background-color: #2196f3;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(1rem);
}
</style> 