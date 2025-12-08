import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: resolve(__dirname, './node_modules/react'),
      'react-dom': resolve(__dirname, './node_modules/react-dom'),
    },
  },
  build: {
    // 移除之前的 cssMinify: 'esbuild'，使用默认设置即可
    // 因为 DaisyUI 4.12.14 是稳定的，不会报错
    chunkSizeWarningLimit: 1000,
  }
})