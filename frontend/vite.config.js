import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api':                 { target: 'http://127.0.0.1:8000', changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
      '/dashboard':           { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/orders':              { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/wagons':              { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/inventory':           { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/analytics':           { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/rakes':               { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/routes':              { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/generate-plan':       { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/weather':             { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/financial':           { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/demurrage':           { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/shift-logs':          { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/locos':               { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/dispatch':            { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/track':               { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/loading-points':      { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/route-consolidation': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/dispatch-plan':       { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/dispatch-intel':      { target: 'http://127.0.0.1:8000', changeOrigin: true },
    }
  },
  build: {
    outDir: 'dist'
  }
})
