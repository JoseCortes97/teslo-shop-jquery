import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

const templates = resolve(__dirname, 'src/templates');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname);

  return {
    root: templates,
    publicDir: resolve(__dirname, 'public'),
    envDir: __dirname,
    resolve: {
      alias: { '@': resolve(__dirname, 'src') },
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          // Bootstrap 5.3 todavía usa @import y funciones globales de Sass
          quietDeps: true,
          silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
        },
      },
    },
    server: {
      port: 5173,
      open: true,
      proxy: {
        // Evita CORS en desarrollo: /api/* → backend
        '/api': env.VITE_API_PROXY || 'http://localhost:3000',
      },
    },
    build: {
      outDir: resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: { index: resolve(templates, 'index.html') },
      },
    },
  };
});
