export type Seat = 'viewer' | 'chat' | 'sales' | 'service' | 'admin';
export type Scope = 'own' | 'team' | 'all';
export type Capability = 'read' | 'chat' | 'sales' | 'service' | 'configure';
export interface Grant { resource: string; action: string; scope: Scope }
export type FieldAction = 'read' | 'write' | 'filter' | 'export';
export interface FieldDeny { resource: string; field: string; actions: readonly FieldAction[] }
export interface Access {
  tenantId: string;
  principalId: string;
  revision: string;
  capabilities: readonly Capability[];
  grants: readonly Grant[];
  teamIds: readonly string[];
  fieldDenies: readonly FieldDeny[];
  roleIds?: readonly string[];
}
export interface RecordAccess {
  tenantId: string;
  ownerPrincipalId: string | null;
  teamId: string | null;
  sharedTeamIds: readonly string[];
}
const seats: Record<Seat, readonly Capability[]> = {
  viewer: ['read'], chat: ['read','chat'], sales: ['read','sales'], service: ['read','service'], admin: ['read','chat','sales','service','configure'],
};
export function seatCapabilities(seat: string): readonly Capability[] {
  return Object.hasOwn(seats,seat) ? seats[seat as Seat] : [];
}
// Initial Identity/Conversation matrix. Future CRM modules register a reviewed
// capability mapping before exposing actions; unknown operations fail closed.
const matrix: Record<string, Partial<Record<string, Capability>>> = {
  chat_inbox: {manage:'chat',share:'chat'},
  conversation_tag: {manage:'chat'},
  chat_snippet: {read:'chat',manage:'chat'},
  automation: {read:'read',design:'configure',publish:'configure',operate:'configure'},
  membership: {read:'configure',create:'configure',update:'configure'},
  role: {read:'configure',create:'configure',update:'configure'},
  team: {read:'configure',create:'configure',update:'configure'},
  agent: {read:'configure',create:'configure',update:'configure'},
  integration: {read:'configure',retry:'configure',configure:'configure'},
  conversation: {read:'read',reply:'chat',note:'chat',update:'chat',assign:'chat',takeover:'chat'},
};
export function permits(access: Access, resource: string, action: string, record?: RecordAccess): boolean {
  const capability = Object.hasOwn(matrix,resource) ? matrix[resource]?.[action] : undefined;
  if (!capability || !access.capabilities.includes(capability)) return false;
  if (record && record.tenantId !== access.tenantId) return false;
  return access.grants.some(grant => {
    if (grant.resource !== resource || grant.action !== action) return false;
    if (grant.scope === 'all') return true;
    if (!record) return false;
    if (grant.scope === 'own') return record.ownerPrincipalId !== null && record.ownerPrincipalId === access.principalId;
    return grant.scope === 'team' && access.teamIds.some(id => id === record.teamId || record.sharedTeamIds.includes(id));
  });
}
export function fieldAllowed(access: Access, resource: string, field: string, action: FieldAction): boolean {
  return !access.fieldDenies.some(deny => deny.resource === resource && deny.field === field &&
    (deny.actions.includes(action) || (action === 'filter' || action === 'export') && deny.actions.includes('read')));
}
export function readableFields(access: Access, resource: string, value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([field]) => fieldAllowed(access,resource,field,'read')));
}
export function parseGrants(value: unknown): Grant[] {
  const grants: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(grants)) throw new Error('Invalid permission configuration');
  return grants.map((grant: unknown) => {
    if (!grant || typeof grant !== 'object') throw new Error('Invalid permission configuration');
    const g = grant as Record<string, unknown>;
    if (Object.keys(g).some(key => !['resource','action','scope'].includes(key)) ||
        typeof g.resource !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(g.resource) ||
        typeof g.action !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(g.action) || !['own','team','all'].includes(String(g.scope))) throw new Error('Invalid permission configuration');
    return {resource:g.resource,action:g.action,scope:g.scope as Scope};
  });
}
