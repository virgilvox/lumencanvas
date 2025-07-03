import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '@clerk/vue';
import { watch } from 'vue';

import LandingPage from '../pages/LandingPage.vue';
import DashboardPage from '../pages/DashboardPage.vue';
import EditorPage from '../pages/EditorPage.vue';
import SignInPage from '../pages/SignInPage.vue';
import SignUpPage from '../pages/SignUpPage.vue';
import ProjectorPage from '../pages/ProjectorPage.vue';

const routes = [
  {
    path: '/',
    name: 'landing',
    component: LandingPage,
  },
  { path: '/sign-in', name: 'sign-in', component: SignInPage },
  { path: '/sign-up', name: 'sign-up', component: SignUpPage },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/editor/:id',
    name: 'editor',
    component: EditorPage,
    props: true,
    meta: { requiresAuth: true },
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
  routes,
});

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    const { isSignedIn, isLoaded } = useAuth();

    if (!isLoaded.value) {
      await new Promise(resolve => {
        const unwatch = watch(isLoaded, (loaded) => {
          if (loaded) {
            unwatch();
            resolve();
          }
        });
      });
    }

    if (!isSignedIn.value) {
      return next({ name: 'sign-in', query: { redirect_url: to.fullPath } });
    }
  }
  next();
});

export default router; 