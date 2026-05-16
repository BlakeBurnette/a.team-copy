// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import prerenderPlugin from '@prerenderer/rollup-plugin';

export default defineConfig({
  plugins: [react()],

  // Minimal safe optimizations
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      plugins: [
        prerenderPlugin({
          routes: [
            '/',
            '/whitepaper',
            '/get-started',
            '/legal/privacy',
            '/legal/terms',
            '/security',
            '/dna',
            '/careers',
            '/blog',
          ],
          renderer: '@prerenderer/renderer-puppeteer',
          rendererOptions: {
            headless: true,
            renderAfterDocumentEvent: 'render-event',
            skipThirdPartyRequests: true,
            timeout: 90 * 1000,
            navigationOptions: {
              timeout: 90 * 1000,
            },
          },
        }),
      ],
    },
  },

  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/crm-api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/crm-api/, '/api'),
      },
      '/acct-api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/acct-api/, '/api'),
      },
    },
  },

  preview: {
    port: 3000,
    // NOTE: Vite preview does not support proxying.
    // For preview/production: either serve the API at the same origin behind a reverse proxy,
    // or set VITE_API_BASE to your API's full URL before building.
  },
});
