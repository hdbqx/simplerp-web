import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 防止 React 多实例问题
      react: resolve(__dirname, './node_modules/react'),
      'react-dom': resolve(__dirname, './node_modules/react-dom'),
    },
  },
  build: {
    // ⬇️ 核心修复：强制使用 esbuild 压缩 CSS，避开 lightningcss 的 bug
    cssMinify: 'esbuild',
    // 增加 chunk 大小警告限制，防止报错
    chunkSizeWarningLimit: 1000,
  }
})