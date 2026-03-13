import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },

  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: [
      'eventemitter3',
      '@provablehq/aleo-wallet-standard',
      '@provablehq/aleo-wallet-adaptor-core',
      '@provablehq/aleo-wallet-adaptor-react',
      '@provablehq/aleo-wallet-adaptor-shield',
      '@provablehq/aleo-types',
    ],
    exclude: ['@provablehq/aleo-wallet-adaptor-react-ui'],
  },
});
