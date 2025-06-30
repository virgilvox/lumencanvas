import { createRouter, createWebHistory } from 'vue-router';
import EditorPage from '../pages/EditorPage.vue';
import ProjectorPage from '../pages/ProjectorPage.vue';

const routes = [
  {
    path: '/',
    name: 'editor',
    component: EditorPage
  },
  {
    path: '/projector/:id',
    name: 'projector',
    component: ProjectorPage,
    props: true
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router; 