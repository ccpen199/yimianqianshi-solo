import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 43480,
    proxy: {
      '/api': {
        target: 'http://localhost:24348',
        changeOrigin: true
      }
    }
  }
})