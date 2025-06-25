import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

// Add this to verify custom element configuration
console.log('Vue3-pixi custom elements configured in vite.config.js')

app.use(pinia)
app.use(router)

app.mount('#app')
