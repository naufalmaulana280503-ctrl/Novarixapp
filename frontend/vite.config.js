import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = env.VITE_BACKEND_PORT || '5000'
  const backendOrigin = env.VITE_API_URL || env.VITE_API_ORIGIN || `http://127.0.0.1:${backendPort}`
  const signalingOrigin = env.VITE_SIGNALING_URL || backendOrigin

  // Surface proxy failures in the terminal instead of letting the browser show
  // an opaque "Network Error" when the Express backend is not running.
  const withErrorLog = (label, options) => ({
    ...options,
    configure: (proxy) => {
      proxy.on('error', (err, req) => {
        console.error(`[vite-proxy:${label}] ${req?.method || ''} ${req?.url || ''} -> ${err.message}`)
      })
    },
  })

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      // Bind to every interface so http://localhost:5173 and
      // http://127.0.0.1:5173 both work identically.
      host: true,
      hmr: {
        clientPort: 5173,
      },
      proxy: {
        '/api': withErrorLog('api', {
          target: backendOrigin,
          changeOrigin: true,
        }),
        '/uploads': withErrorLog('uploads', {
          target: backendOrigin,
          changeOrigin: true,
        }),
        '/socket.io': withErrorLog('socket.io', {
          target: signalingOrigin,
          changeOrigin: true,
          ws: true,
        }),
      },
    },
  }
})
