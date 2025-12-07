import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react({ fastRefresh: false })],
  server: {
    host: true,
    port: 5173,
    hmr: { overlay: false }
  },
  preview: {
    host: true,
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
})
