import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import VueFinder from 'vuefinder/dist/vuefinder'
import 'vuefinder/dist/style.css'

const app = createApp(App)
const pinia = createPinia()

// Add this to verify custom element configuration
console.log('Vue3-pixi custom elements configured in vite.config.js')

app.use(pinia)
app.use(router)
app.use(VueFinder)

app.mount('#app')
