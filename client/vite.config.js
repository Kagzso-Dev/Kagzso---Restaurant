import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // ── Pre-bundle heavy deps so the browser doesn't have to do it ────────────
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'socket.io-client', 'lucide-react'],
  },

  build: {
    // ── Modern, stable build configuration ──────────────────────────────────
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            // Group UI and other heavy utilities
            if (id.includes('lucide-react') || id.includes('socket.io-client')) {
              return 'vendor-ui';
            }
            // All other node_modules go to standard vendor chunk
            return 'vendor';
          }
        },
      },
    },
    // Production settings
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
  },

  // ── Production optimizations ──────────────────────────────────────────────
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },

  server: {
    port: 5173,
    host: true,
  },
}));
