import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@huggingface/transformers', 'onnxruntime-web'],
  },
  worker: { format: 'es' as const },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
