import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'lucide';
            if (id.includes('@lexical') || id.includes('/lexical/') || id.includes('lexical')) return 'lexical';
            if (id.includes('react') || id.includes('scheduler') || id.includes('jsx-runtime')) return 'react';
            if (id.includes('abcjs')) return 'abcjs';
            return 'vendor';
          }
        },
      },
    },
  },
})
