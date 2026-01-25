import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  preview: {
    port: process.env.PORT || 5173,
    host: '0.0.0.0',
    allowedHosts: [
      'stickman-obstacle-course-production.up.railway.app',
      '.railway.app'
    ]
  }
});
