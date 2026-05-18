import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 24343,
    proxy: {
      '/api': {
        target: 'http://localhost:24342',
        changeOrigin: true
      }
    }
  }
})