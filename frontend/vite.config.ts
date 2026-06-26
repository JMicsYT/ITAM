import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),  // Tailwind v4 native Vite plugin — no postcss.config.js needed
    react(),
  ],
  server: {
    port: 5173,
    proxy: {
      // Проксируем /api запросы к бэкенду (избегаем CORS в dev)
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
