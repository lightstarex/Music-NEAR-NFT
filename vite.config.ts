import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'process', 'path'],
    }),
  ],
  define: {
    'process.env': {},
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify('v16.0.0'),
    global: 'window',
  },
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      assert: 'assert',
      process: 'process/browser',
    },
  },
})

