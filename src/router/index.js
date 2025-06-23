import { createRouter, createWebHistory } from 'vue-router';
import EditorPage from '../pages/EditorPage.vue';

const routes = [
  {
    path: '/',
    name: 'Editor',
    component: EditorPage,
  },
  // Other routes like /sign-in, /projector/:id will be added here
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router; 