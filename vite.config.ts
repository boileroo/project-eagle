import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// TanStack Start registers the `tanstack-start-injected-head-scripts:v` virtual
// module only for the SSR (server) environment. However, `@tanstack/start-server-core`
// is transitively imported into the client bundle via `@tanstack/react-start/server`
// (used in __root.tsx), causing Vite's import-analysis to try — and fail — to resolve
// the virtual module in the client environment, breaking client-side hydration.
// This stub plugin satisfies the resolver in both environments during dev.
const injectHeadScriptsStub = (): import('vite').Plugin => ({
  name: 'tanstack-start-injected-head-scripts-client-stub',
  enforce: 'pre',
  // Only apply in the client environment. The server environment must use the real
  // virtual module (registered by @tanstack/start-plugin-core) so that the React HMR
  // preamble is extracted from transformIndexHtml and injected into the SSR HTML.
  applyToEnvironment(env) {
    return env.config.consumer === 'client';
  },
  resolveId(id) {
    if (id === 'tanstack-start-injected-head-scripts:v') {
      return '\0tanstack-start-injected-head-scripts:v';
    }
  },
  load(id) {
    if (id === '\0tanstack-start-injected-head-scripts:v') {
      return `export const injectedHeadScripts = undefined;`;
    }
  },
});

// `@tanstack/react-start/server` (and the whole chain it re-exports: react-start-server →
// start-server-core → request-response.js) uses `node:async_hooks` and other Node-only APIs.
// In `__root.tsx` only `setResponseHeaders` is imported, guarded by `typeof window === 'undefined'`
// so it never actually runs on the client. We stub the entire module for the client env.
const reactStartServerClientStub = (): import('vite').Plugin => ({
  name: 'tanstack-react-start-server-client-stub',
  enforce: 'pre',
  applyToEnvironment(env) {
    return env.config.consumer === 'client';
  },
  resolveId(id) {
    if (
      id === '@tanstack/react-start/server' ||
      id === '@tanstack/react-start-server' ||
      id === '@tanstack/start-server-core'
    ) {
      return `\0react-start-server-client-stub:${id}`;
    }
  },
  load(id) {
    if (id.startsWith('\0react-start-server-client-stub:')) {
      // All these exports are server-only and guarded by typeof window === 'undefined'
      // in the app code, so returning no-op stubs is safe.
      return `export const setResponseHeaders = () => {};
export const getRequest = () => undefined;
export const getResponse = () => undefined;
export const setCookie = () => {};
export const getCookie = () => undefined;
export const getCookies = () => ({});
export const deleteCookie = () => {};
export const setResponseStatus = () => {};
export const getResponseStatus = () => undefined;
export const setResponseHeader = () => {};
export const getResponseHeader = () => undefined;
export const getResponseHeaders = () => ({});
export const getRequestHeader = () => undefined;
export const getRequestHeaders = () => ({});
export const getRequestHost = () => undefined;
export const getRequestIP = () => undefined;
export const getRequestProtocol = () => undefined;
export const getRequestUrl = () => undefined;
export const removeResponseHeader = () => {};
export const clearResponseHeaders = () => {};
export const requestHandler = () => {};
export const createStartHandler = () => {};
export const createRequestHandler = () => {};
export const defineHandlerCallback = () => {};
export const attachRouterServerSsrUtils = () => {};
export const transformPipeableStreamWithRouter = () => {};
export const transformReadableStreamWithRouter = () => {};
export const StartServer = undefined;
export const defaultRenderHandler = undefined;
export const defaultStreamHandler = undefined;
export const useSession = () => undefined;
export const getSession = () => undefined;
export const updateSession = () => {};
export const sealSession = () => undefined;
export const unsealSession = () => undefined;
export const clearSession = () => {};
export const getValidatedQuery = () => undefined;
export const HEADERS = {};
export const VIRTUAL_MODULES = {};
`;
    }
  },
});

// `@tanstack/start-storage-context` uses `node:async_hooks` (AsyncLocalStorage), which is
// server-only. It's imported by `@tanstack/start-client-core` via isomorphic helpers that
// use it only on the server branch. We stub it in the client env so the import doesn't blow
// up, while keeping the server env using the real module.
const startStorageContextClientStub = (): import('vite').Plugin => ({
  name: 'tanstack-start-storage-context-client-stub',
  enforce: 'pre',
  applyToEnvironment(env) {
    return env.config.consumer === 'client';
  },
  resolveId(id) {
    if (id === '@tanstack/start-storage-context') {
      return '\0start-storage-context-client-stub';
    }
  },
  load(id) {
    if (id === '\0start-storage-context-client-stub') {
      // These functions are never called on the client (guarded by createIsomorphicFn),
      // so no-ops are safe here.
      return `
export const getStartContext = () => undefined;
export const runWithStartContext = (ctx, fn) => fn();
`;
    }
  },
});

// `@tanstack/react-start/server` transitively imports `@tanstack/react-router/ssr/server`
// which does `import ReactDOMServer from "react-dom/server"` and `import { PassThrough } from "node:stream"`.
// In the client bundle these Node-only modules fail. Since the server-rendering functions
// (renderRouterToString, renderRouterToStream, etc.) never run on the client, we stub
// `@tanstack/react-router/ssr/server` in the client env, but re-export the parts that ARE
// legitimately needed on the client (defineHandlerCallback, createRequestHandler, etc.)
// from `@tanstack/router-core/ssr/server` which IS safe in the browser.
const serverModulesClientStub = (): import('vite').Plugin => ({
  name: 'tanstack-server-modules-client-stub',
  enforce: 'pre',
  applyToEnvironment(env) {
    return env.config.consumer === 'client';
  },
  resolveId(id) {
    if (id === '@tanstack/react-router/ssr/server') {
      return `\0server-stub:${id}`;
    }
  },
  load(id) {
    if (id === '\0server-stub:@tanstack/react-router/ssr/server') {
      // Re-export the browser-safe parts from router-core/ssr/server,
      // and stub out the server-only rendering functions.
      return `
export * from "@tanstack/router-core/ssr/server";
export const RouterServer = undefined;
export const defaultRenderHandler = undefined;
export const defaultStreamHandler = undefined;
export const renderRouterToStream = undefined;
export const renderRouterToString = undefined;
`;
    }
  },
});

export default defineConfig({
  server: {
    port: 5173,
  },
  plugins: [
    tsConfigPaths(),
    injectHeadScriptsStub(),
    reactStartServerClientStub(),
    startStorageContextClientStub(),
    serverModulesClientStub(),
    tanstackStart({
      pages: [
        {
          path: '/offline',
          prerender: {
            enabled: true,
          },
        },
      ],
    }),
    // React's Vite plugin must come after Start's Vite plugin
    viteReact(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Aerie',
        short_name: 'Aerie',
        description: 'Offline-first golf scoring and tournament management.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#FAF9F6',
        background_color: '#FAF9F6',
        icons: [
          {
            src: '/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: '/pwa-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: '/pwa-128x128.png',
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: '/pwa-144x144.png',
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-256x256.png',
            sizes: '256x256',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/apple-touch-icon-180x180.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        navigateFallback: '/offline',
        navigateFallbackAllowlist: [/^\//],
        navigateFallbackDenylist: [/^\/_auth(?:\/|$)/],
        additionalManifestEntries: [{ url: '/offline', revision: null }],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === 'style' ||
              request.destination === 'script' ||
              request.destination === 'font',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
});
