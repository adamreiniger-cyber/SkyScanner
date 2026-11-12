/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The live site is served from a sub-path (webuiltthis.co.uk/SkyScanner/),
// so assets must be referenced relatively.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: true,
    env: { TZ: 'Europe/London' },
  },
})
