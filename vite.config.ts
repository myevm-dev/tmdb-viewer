import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 3000,
    proxy: {
      // Clanker's public API doesn't send CORS headers, so we proxy it in dev
      // (and via vercel.json rewrites in production).
      '/clanker-api': {
        target: 'https://www.clanker.world',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/clanker-api/, '/api'),
      },
    },
  },
});
