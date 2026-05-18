import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 43472,
    proxy: {
      '/api': {
        target: 'http://localhost:43471',
        changeOrigin: true
      }
    }
  }
})
