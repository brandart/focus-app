import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {
    build: {
      rollupOptions: {
        input: {
          setup: resolve('src/preload/setup.ts'),
          overlay: resolve('src/preload/overlay.ts')
        }
      }
    }
  },
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          setup: resolve('src/renderer/setup/index.html'),
          overlay: resolve('src/renderer/overlay/index.html')
        }
      }
    }
  }
})
