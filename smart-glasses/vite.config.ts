import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/frontend'),        // your App.tsx, main.tsx here
  build: {
    outDir: resolve(__dirname, 'dist/frontend'),
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/webview': { target: 'http://localhost:3000', changeOrigin: true },
      '/webhook': { target: 'http://localhost:3000', changeOrigin: true }
    }
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src/frontend') }
  }
});
