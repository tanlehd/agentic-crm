import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@agentic-crm/contracts': fileURLToPath(new URL('./packages/contracts/src/index.ts', import.meta.url)) } },
  test: {
    include: ['packages/**/*.test.ts', 'apps/backend/**/*.test.ts'],
    environment: 'node',
  },
});
