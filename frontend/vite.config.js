import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The browser only ever calls http://localhost:5173/api/... and Vite forwards
    // it to the C# API. Same origin, so CORS is never involved.
    // Start the backend with: dotnet run --urls http://localhost:5000
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
