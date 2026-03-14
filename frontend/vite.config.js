import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../static/app',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/linkhub': 'http://localhost:8080',
      '/l': 'http://localhost:8080',
      '/health': 'http://localhost:8080',
    }
  }
})
