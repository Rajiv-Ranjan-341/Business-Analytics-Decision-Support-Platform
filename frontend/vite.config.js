import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // No source file imports React — JSX goes through the automatic runtime. The
  // build infers that on its own; the test transform does not, and without this
  // every render in a test dies on "React is not defined".
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
