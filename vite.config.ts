import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/interpolation-visualizer/', // リポジトリ名に合わせて変更してください
})
