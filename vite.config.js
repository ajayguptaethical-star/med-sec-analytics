import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,

    // ✅ Auto-open Chrome when dev server starts
    open: 'http://localhost:5173',

    // ✅ HMR — live updates without full page reload
    hmr: {
      overlay: true,  // shows errors directly on the browser screen
    },

    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    },

    watch: {
      // Ignore database, backups, uploads — runtime files that must NOT trigger reload
      ignored: [
        '**/data.db',
        '**/data.db-shm',
        '**/data.db-wal',
        '**/backups/**',
        '**/uploads/**',
        '**/node_modules/**'
      ]
    }
  }
});
