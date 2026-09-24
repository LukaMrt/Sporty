import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Tests du frontend (composants React, hooks, fonctions de format).
 * Le backend garde Japa (`node ace test`).
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~/': `${import.meta.dirname}/inertia/`,
    },
  },
  test: {
    environment: 'jsdom',
    include: ['inertia/**/*.test.{ts,tsx}'],
    setupFiles: ['inertia/test/setup.ts'],
  },
})
