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
    // ── Smaller chunks for better mobile caching ────────────────────────────
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — tiny, rarely changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Heavy UI deps isolated so they cache separately
          'vendor-ui': ['lucide-react', 'socket.io-client'],
        },
      },
    },
    // No source maps in production (saves bandwidth on mobile)
    sourcemap: false,
    // Target modern browsers; drops legacy polyfills
    target: 'es2020',
  },

  // ── Drop console.* and debugger statements in production ──────────────────
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
