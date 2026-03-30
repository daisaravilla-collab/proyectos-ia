import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['pdfjs-dist'],
    },
    server: {
      hmr: false,
      watch: {
        usePolling: true,
        interval: 1000,
      },
      host: '0.0.0.0',
      port: 3000,
    },
    build: {
      target: 'esnext',
      // Aumentamos la memoria de compilación para que no colapse con archivos grandes
      chunkSizeWarningLimit: 3000, 
    }
  };
});