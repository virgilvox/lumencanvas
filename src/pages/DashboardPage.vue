<template>
  <div class="dashboard-page">
    <header class="app-header">
      <div class="logo-area">
        <router-link to="/dashboard">LumenCanvas</router-link>
      </div>
      <div class="user-area">
        <SignedIn>
          <UserButton after-sign-out-url="/" />
        </SignedIn>
      </div>
    </header>

    <div class="dashboard-content">
      <header class="dashboard-header">
        <h1>Your Projects</h1>
        <button class="create-btn" @click="createNew">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Create New Project</span>
        </button>
      </header>

      <div v-if="loading" class="loading-state">
        <p>Loading projects...</p>
      </div>
      
      <div v-else-if="error" class="error-state">
        <h2>Something went wrong</h2>
        <p>{{ error }}</p>
        <button class="create-btn" @click="fetchProjects">Retry</button>
      </div>
      
      <div v-else-if="projects.length === 0" class="empty-state">
        <h2>Welcome to LumenCanvas</h2>
        <p>You don't have any projects yet. Let's create your first one!</p>
        <button class="create-btn large" @click="createNew">
          Create Your First Project
        </button>
      </div>

      <div v-else class="project-grid">
        <div 
          v-for="project in validProjects" 
          :key="project.id" 
          class="project-card"
          @click="openProject(project.id)"
        >
          <div class="card-content">
            <h3 class="project-name">{{ project.metadata?.name }}</h3>
            <p class="project-updated">Last updated: {{ formatDate(project.metadata?.modified) }}</p>
          </div>
          <div class="card-actions">
            <button @click.stop="deleteProject(project.id)" class="delete-btn">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <CreateProjectModal 
      v-model="showCreateModal"
      @project-created="handleProjectCreated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import { useSession, SignedIn, UserButton } from '@clerk/vue';
import CreateProjectModal from '../components/CreateProjectModal.vue';
import { useProjectStore } from '../store/project';

const router = useRouter();
const projects = ref([]);
const loading = ref(true);
const error = ref(null);
const { session } = useSession();
const showCreateModal = ref(false);
const projectStore = useProjectStore();

async function fetchProjects() {
  loading.value = true;
  error.value = null;
  try {
    projects.value = await api.projects.list();
  } catch (err) {
    console.error('Failed to fetch projects:', err);
    error.value = 'Could not load projects. Please try again later.';
    projects.value = [];
  } finally {
    loading.value = false;
  }
}

async function createNew() {
  showCreateModal.value = true;
}

function handleProjectCreated(newProject) {
  projectStore.setCurrentProjectData(newProject);
  router.push({ 
    name: 'editor', 
    params: { id: newProject.id },
    state: { project: newProject }
  });
}

function openProject(projectId) {
  window.location.href = `/editor/${projectId}`;
}

async function deleteProject(projectId) {
  if (confirm('Are you sure you want to delete this project? This cannot be undone.')) {
    try {
      await api.projects.delete(projectId);
      await fetchProjects(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }
}

const validProjects = computed(() => {
  return projects.value.filter(p => p && p.id && p.metadata);
});

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

onMounted(() => {
  if (session.value) {
    fetchProjects();
  }
});

watch(session, (newSession) => {
  if (newSession) {
    fetchProjects();
  }
});
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background-color: var(--panel-bg);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.logo-area a {
  font-weight: 500;
  font-size: 16px;
  color: var(--text-primary);
  text-decoration: none;
}

.user-area {
  display: flex;
  align-items: center;
}

.dashboard-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  overflow-y: auto;
  flex-grow: 1;
}
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
h1 {
  font-size: 2rem;
  font-weight: 600;
}
.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: #12B0FF;
  color: #000;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}
.create-btn:hover {
  opacity: 0.9;
}
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
.project-card {
  background-color: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.project-card:hover {
  transform: translateY(-5px);
  border-color: #12B0FF;
}
.project-name {
  font-size: 1.25rem;
  margin: 0 0 0.5rem;
}
.project-updated {
  font-size: 0.875rem;
  color: #888;
}
.card-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}
.delete-btn {
  background: none;
  border: 1px solid #555;
  color: #aaa;
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.delete-btn:hover {
  background-color: #ff4444;
  color: white;
  border-color: #ff4444;
}
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  border: 2px dashed #333;
  border-radius: 8px;
  margin-top: 2rem;
}
.empty-state h2 {
  font-size: 1.8rem;
  margin-bottom: 1rem;
}
.empty-state p {
  color: #888;
  margin-bottom: 2rem;
}
.create-btn.large {
  padding: 12px 24px;
  font-size: 1rem;
}
.loading-state {
  text-align: center;
  padding: 4rem;
  color: #888;
}
.error-state {
  text-align: center;
  padding: 4rem 2rem;
  border: 2px dashed #ff4444;
  border-radius: 8px;
  margin-top: 2rem;
  color: #ff4444;
}
</style> 