import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/main/services/**/*.ts',
        'src/main/builders/**/*.ts',
        'src/main/utils/**/*.ts',
        'src/preload/api.ts',
        'src/renderer/src/stores/**/*.ts'
      ]
    }
  }
})
