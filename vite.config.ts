import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import packageJson from './package.json'

export default defineConfig({
  plugins: [react()],
  base: './',
  root: '.',
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
