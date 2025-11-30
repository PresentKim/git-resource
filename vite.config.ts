import path from 'path'
import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({mode}) => {
  const env = {...process.env, ...loadEnv(mode, process.cwd())}

  return {
    plugins: [react(), tailwindcss()],
    base: env.VITE_BASE_URL || '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    worker: {
      format: 'es',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: id => {
            // Vendor chunks for better caching
            if (id.includes('node_modules')) {
              // Keep React and React DOM in vendor chunk (don't split)
              // Splitting React can cause loading order issues
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor'
              }
              // React Router (depends on React)
              if (id.includes('react-router')) {
                return 'router-vendor'
              }
              // Radix UI components (depends on React)
              if (id.includes('@radix-ui')) {
                return 'radix-vendor'
              }
              // Zustand
              if (id.includes('zustand')) {
                return 'zustand-vendor'
              }
              // Lucide React icons (large library, split separately)
              if (id.includes('lucide-react')) {
                return 'icons-vendor'
              }
              // Large utility libraries (dynamic imports, so separate)
              if (id.includes('jszip') || id.includes('file-saver')) {
                return 'zip-vendor'
              }
              // Other node_modules
              return 'vendor'
            }
          },
        },
      },
      // Enable source maps for production debugging (optional)
      sourcemap: false,
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
      // Minification
      minify: 'esbuild',
      // Target modern browsers for smaller bundle
      target: 'esnext',
    },
  }
})
