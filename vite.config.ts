/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    strictPort: true,
    // The API runs as its own process in dev; same-origin via proxy keeps cookies SameSite.
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: false } },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // Keep the framework + motion runtime in stable, long-cacheable chunks.
        manualChunks(id: string) {
          if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'motion';
          if (id.includes('node_modules/@dimforge/rapier3d-compat') || id.includes('node_modules/@react-three/rapier')) return 'rapier';
          if (id.includes('node_modules/@react-three/drei') || id.includes('node_modules/@react-three/fiber') || id.includes('node_modules/three-stdlib')) return 'react-three';
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Server tests run a real embedded Postgres per file; under a full parallel run some take longer than 5s.
    testTimeout: 20_000,
  },
});


