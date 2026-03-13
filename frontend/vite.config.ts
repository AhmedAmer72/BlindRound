import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Default environment for React hook tests
    environment: 'jsdom',
    // On-chain tests override with // @vitest-environment node in the file
    server: {
      deps: {
        // Allow the Aleo node.js SDK to be resolved properly in test context
        inline: ['@provablehq/sdk'],
      },
    },
    testTimeout: 300_000,  // 5 min max — testnet TXs can take 30-90 s each
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
