import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { alias: { '@agentic-crm/contracts': fileURLToPath(new URL('./packages/contracts/src/index.ts', import.meta.url)) } },
  test: {
    include: ['services/**/*.test.ts', 'packages/**/*.test.ts', 'apps/backend/**/*.test.ts', 'apps/web/**/*.test.tsx'],
    environment: 'node',
  },
});
