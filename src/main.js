import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { clerkPlugin } from '@clerk/vue'

const app = createApp(App)
const pinia = createPinia()

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing Clerk Publishable Key in .env file");
}

app.use(clerkPlugin, {
  publishableKey: clerkPubKey,
  routerPush: (to) => router.push(to),
  routerReplace: (to) => router.replace(to),
});

// Add this to verify custom element configuration
console.log('Vue3-pixi custom elements configured in vite.config.js')

app.use(pinia)
app.use(router)

app.mount('#app')
