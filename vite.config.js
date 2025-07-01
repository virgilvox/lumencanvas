import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { isCustomElement, transformAssetUrls } from 'vue3-pixi/compiler';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: { 
          isCustomElement: (tag) => {
            const isPixi = isCustomElement(tag);
            const isVueFinder = tag.startsWith('v-f-');
            return isPixi || isVueFinder;
          }
        },
        transformAssetUrls,
      },
    }),
  ],
  resolve: {
    alias: {
      // Add any aliases if needed
    },
  },
  optimizeDeps: {
    include: ['vuefinder/dist/vuefinder']
  },
  server: {
    proxy: {
      // Proxy API requests to the Netlify Functions dev server
      '^/api/vf(?:/.*|)$': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api\/vf/, '/.netlify/functions/vf')
      }
    }
  }
})
