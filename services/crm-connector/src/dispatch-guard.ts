import type { PoolConnection } from 'mysql2/promise';
import type { DispatchBinding } from '@agentic-crm/contracts';
import { BridgeError, canonical, uuid } from './validation.js';

export function storageError(code:string):never {
 throw new BridgeError(code==='FORBIDDEN'?403:code==='INVALID_REQUEST'?400:409,code);
}
export function businessTenant(tenantId:string, binding:DispatchBinding) {
 if(!uuid(tenantId) || tenantId!==tenantId.toLowerCase() || tenantId==='01900000-0000-7000-8000-000000000001' || binding.tenant_id!==tenantId) storageError('FORBIDDEN');
}
export const bindingFields = ['tenant_id','intent_id','attempt_id','conversation_id','crm_contact_id','connection_id','principal_id','delegation_id','actor_kind','owner_revision','record_version','payload_digest'] as const;
export function bindingFromRow(row:Record<string,unknown>) {
 return Object.fromEntries(bindingFields.map(key=>[key,String(row[key])]));
}
export interface GuardRow extends Record<string,unknown> {
 state:'staged'|'prepared'|'cancelled'|'admitting'|'started'|'unknown'|'sent'; version:string|number; cancellation_id:string|null; cancellation_reason:string|null;
}
/** Caller validated schema and tenant. Exclusive no-op upsert avoids duplicate-insert lock upgrades. */
export async function lockDispatchGuard(c:PoolConnection,b:DispatchBinding):Promise<GuardRow> {
 await c.execute(`INSERT INTO connector_dispatch_guard (${bindingFields.join(',')},state,created_at,updated_at)
 VALUES (${bindingFields.map(()=>'?').join(',')},'staged',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
 ON DUPLICATE KEY UPDATE intent_id=intent_id`,bindingFields.map(key=>b[key]));
 const [rows]=await c.query<any[]>('SELECT * FROM connector_dispatch_guard WHERE tenant_id=? AND intent_id=? FOR UPDATE',[b.tenant_id,b.intent_id]);
 const row=rows[0] as GuardRow|undefined;
 if(!row || canonical(bindingFromRow(row))!==canonical(b)) storageError('CONFLICT');
 return row;
}
