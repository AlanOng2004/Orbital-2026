import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../../backend/src/main/resources/static/annotator',
    emptyOutDir: true,
  },
})
