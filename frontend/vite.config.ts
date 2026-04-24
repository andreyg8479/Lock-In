import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@huggingface/transformers', 'onnxruntime-web'],
  },
  worker: { format: 'es' as const },
})
