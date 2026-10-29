import { readFile } from 'node:fs/promises';
import { required } from '@agentic-crm/workload-transport';
import type { OwnerCompositionConfig } from './owner-composition.js';

export async function baselineOwnerConfig(): Promise<OwnerCompositionConfig> {
  const input = JSON.parse(await readFile(required(process.env, 'BASELINE_OWNER_CONFIG_FILE'), 'utf8'));
  const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
  if (!Array.isArray(input.tenants) || !input.tenants.length || !input.tenants.every(uuid)
    || new Set(input.tenants).size !== input.tenants.length || input.tenants.includes('01900000-0000-7000-8000-000000000001')) throw new Error('OWNER_TENANTS_REQUIRED');
  for (const tenant of input.tenants) {
    if (!uuid(input.conversationObjects?.[tenant]) || !uuid(input.projectionObjects?.[tenant]?.contact)
      || !uuid(input.projectionObjects?.[tenant]?.activity) || !uuid(input.routingActors?.[tenant])) throw new Error('OWNER_OBJECTS_AND_ACTORS_REQUIRED');
  }
  return { tenants: input.tenants, chat: new URL(input.chat), identity: new URL(input.identity), routing: new URL(input.routing),
    conversationObjects: new Map(Object.entries(input.conversationObjects)), projectionObjects: new Map(Object.entries(input.projectionObjects)),
    routingActors: new Map(Object.entries(input.routingActors)), };
}
