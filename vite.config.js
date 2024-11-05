// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env': {},
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'arcgis-js-api': ['@arcgis/core'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@arcgis/core'],
  },
});
