import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env': {}
  },
  resolve: {
    alias: {
      '@arcgis/core': resolve(__dirname, 'node_modules/@arcgis/core')
    }
  },
  optimizeDeps: {
    exclude: ['@arcgis/core']
  }
});
