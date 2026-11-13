import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const { VITE_API_PROXY_TARGET } = loadEnv(mode, process.cwd(), 'VITE_');
  const apiProxyTarget = VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000';

  return {
    base: '/porcinos_frontend/',
    plugins: [react()],
    server: {
      port: 4173,
      strictPort: true,
      proxy: {
        '/api/v1': apiProxyTarget
      }
    },
    preview: {
      proxy: {
        '/api/v1': apiProxyTarget
      }
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
      css: false,
      restoreMocks: true
    }
  };
});
