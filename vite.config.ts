import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': JSON.stringify({}),
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify('v16.0.0'),
  },
})

