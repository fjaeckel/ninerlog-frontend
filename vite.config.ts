import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

/**
 * The e2e stack serves the app over TLS (self-signed) when E2E_HTTPS=1.
 *
 * Plain HTTP on a non-loopback host is not a secure context, which hides
 * window.PublicKeyCredential and navigator.clipboard — so the passkey suite
 * could never run and the capability probe reported both as missing. Chromium's
 * --unsafely-treat-insecure-origin-as-secure was meant to cover this and does
 * not actually take effect, so the origin has to be genuinely secure instead.
 *
 * Off by default: `npm run dev` stays on http so nothing local has to trust a
 * throwaway certificate.
 */
const e2eHttps = process.env.E2E_HTTPS === '1';

/**
 * Build identity stamped into the bundle and reported to GET /admin/update.
 * The Docker build passes APP_VERSION from the image tag and APP_COMMIT from
 * the commit it was built at. An unstamped build reports "dev" and no commit,
 * which the API reports as an unknown version rather than comparing it.
 *
 * A `latest` image has no version to compare, so the commit is what the API
 * measures against the tracked branch.
 */
const appVersion = process.env.APP_VERSION?.trim() || 'dev';
const appCommit = process.env.APP_COMMIT?.trim() || '';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT__: JSON.stringify(appCommit),
  },
  plugins: [
    tailwindcss(),
    react(),
    e2eHttps && basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg', 'logo.svg'],
      workbox: {
        // Don't cache API calls — the app must always hit the live API for auth
        // and data freshness. Caching /api/* would break session resume on iOS.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'NinerLog',
        short_name: 'NinerLog',
        description: 'EASA/FAA Compliant Pilot Logbook',
        id: '/',
        scope: '/',
        start_url: '/dashboard',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        theme_color: '#1E3A5F',
        background_color: '#0f172a',
        categories: ['productivity', 'utilities', 'travel'],
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml', purpose: 'any' },
          { src: 'logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
    // Bundle size visualization — generates dist/stats.html on build
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  build: {
    sourcemap: false, // Explicitly disable source maps in production builds
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/*.spec.ts'
    ]
  }
});
