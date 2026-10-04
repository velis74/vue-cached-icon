/// <reference types="vitest" />
import { resolve } from 'path';

import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import eslint from 'vite-plugin-eslint';

export default defineConfig({
  plugins: [
    vue({ template: { compilerOptions: { compatConfig: { MODE: 2 } } } }),
    {
      // do not fail on serve (i.e. local development)
      ...eslint({
        failOnWarning: false,
        failOnError: false,
      }),
      apply: 'serve',
      enforce: 'post',
    },
    dts({
      tsconfigPath: './tsconfig.build.json',
      rollupTypes: true,
    }),
    visualizer({
      open: false,
      filename: 'coverage/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    target: 'es2015',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['umd', 'es'],
      fileName: 'vue-cached-icon',
      name: 'vue-cached-icon',
    },
    rollupOptions: {
      external: ['vue', 'axios', 'isomorphic-dompurify'],
      output: {
        globals: (id: string) => id, // all external modules are currently not aliased to anything but their own names
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['./src/**/*.spec.*'],
    coverage: { provider: 'v8', include: ['src/**'], exclude: ['src/**/*.spec.*', 'src/index.ts'] },
  },
});
