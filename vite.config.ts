import { defineConfig } from 'vite'

const apiTarget = process.env.SETRAI_DEV_API_URL ??
  `http://127.0.0.1:${process.env.SETRAI_PORT ?? '3000'}`

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    sourcemap: true
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true
      }
    }
  }
})
