import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: [
      // next-intl's client navigation imports the extensionless specifier,
      // which Vite cannot resolve against Next's ESM build.
      { find: /^next\/navigation$/, replacement: 'next/navigation.js' },
      // `server-only` throws on import unless the bundler resolves the
      // react-server condition, which Vite does not. The package ships
      // empty.js for exactly that condition; pointing at it lets a server
      // module be unit-tested without dropping the marker that keeps it off
      // the client.
      { find: /^server-only$/, replacement: './node_modules/server-only/empty.js' },
    ],
  },
  test: {
    globals: true,
    // next-intl's client navigation must be processed by Vite, or the alias
    // above never applies and the extensionless next/navigation import fails.
    server: { deps: { inline: ['next-intl'] } },
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
  },
})
