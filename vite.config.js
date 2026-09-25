import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split the ~6MB single chunk: vendor libs, charts, and sheet grids
        // each become their own cacheable chunk loaded on demand.
        // (Function form — Vite 8/rolldown requires this shape.)
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'charts';
            if (
              id.includes('xlsx') || id.includes('papaparse') ||
              id.includes('@fortune-sheet') || id.includes('ag-grid')
            ) return 'sheets';
            if (
              id.includes('/react/') || id.includes('/react-dom/') ||
              id.includes('/react-router-dom/') || id.includes('/scheduler/')
            ) return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
})
