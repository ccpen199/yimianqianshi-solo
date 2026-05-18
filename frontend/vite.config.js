import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 24342,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:24340',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
