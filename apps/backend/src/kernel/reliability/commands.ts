import { createHash, randomUUID } from 'node:crypto';
import type { TransactionScope } from '../tenancy/unit-of-work.js';
export class CommandError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export interface CommandIdentity { actorId: string; correlationId: string; route: string; key: string; body: unknown; version?: string }
export interface CommandResponse { status: number; body: {data: Record<string,unknown>; meta:{correlation_id:string}} }
export class DurableCommands {
  async systemAudit(scope:TransactionScope,correlation:string,resource:string,id:string,action:string,fields:string[]){
    await scope.query("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'system',?,?,?,?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),scope.context.tenantId,scope.context.tenantId,action,resource,id,JSON.stringify(fields),correlation]);
  }
  async conversationEvent(scope:TransactionScope,correlation:string,type:'conversation.created'|'message.received'|'message.sent'|'message.delivery_failed',id:string,version:string,payload:Record<string,unknown>){
    await scope.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,?,1,'conversation',?,?,?,?,'system',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),scope.context.tenantId,type,id,version,JSON.stringify(payload),correlation,scope.context.tenantId]);
  }
  async domainEvent(scope:TransactionScope,actorId:string,correlationId:string,eventType:'contact.created'|'lead.created'|'lead.qualified',recordId:string,version:string,payload:Record<string,unknown>){
    await scope.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,?,1,?,?,?,?,?,'human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),scope.context.tenantId,eventType,eventType.split('.')[0],recordId,version,JSON.stringify(payload),correlationId,actorId]);
  }
  async fixtureAccessChanged(scope:TransactionScope,principal:{id:string;version:string;auth_revision:string}){await scope.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'principal.access_changed',1,'principal',?,?,?,'m1-fixture-v3','system',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),scope.context.tenantId,principal.id,principal.version,JSON.stringify({principal_id:principal.id,auth_revision:principal.auth_revision}),scope.context.tenantId]);}
  async m1BootstrapExists(scope:TransactionScope){return !!(await scope.query("SELECT id FROM audit_entry WHERE tenant_id=? AND action='crm.bootstrap.v3' AND actor_kind='system'",[scope.context.tenantId]))[0];}
  async m1Bootstrapped(scope:TransactionScope){const tenant=scope.context.tenantId;await scope.query("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'system',?,'crm.bootstrap.v3','tenant',?,'accepted',JSON_ARRAY('crm_fixture_v3'),'m1-fixture-v3',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,tenant,tenant]);}
  async registryBootstrapped(scope: TransactionScope, correlationId: string) {
    const tenant=scope.context.tenantId;
    await scope.query("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'system',?,'registry.bootstrap.v2','tenant',?,'accepted',JSON_ARRAY('registry_fixture_v2'),?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,tenant,tenant,correlationId]);
  }
  async registryBootstrapExists(scope: TransactionScope): Promise<boolean> {
    return !!(await scope.query("SELECT id FROM audit_entry WHERE tenant_id=? AND action='registry.bootstrap.v2' AND actor_kind='system' AND actor_id=?",[scope.context.tenantId,scope.context.tenantId]))[0];
  }
  async recordAssigned(scope: TransactionScope, actorId:string, correlationId:string, recordId:string, version:string, payload:Record<string,unknown>) {
    await scope.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'record.assigned',1,'crm_record',?,?,?,?,'human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),scope.context.tenantId,recordId,version,JSON.stringify(payload),correlationId,actorId]);
  }
  async bootstrapRecorded(scope: TransactionScope, correlationId: string, principals: string[]) {
    const tenant=scope.context.tenantId;
    await scope.query("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'system',?,'identity.bootstrap','tenant',?,'accepted',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,tenant,tenant,JSON.stringify(['identity_fixture_v1']),correlationId]);
    for(const principal of principals) await scope.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'principal.access_changed',1,'principal',?,1,?,?,'system',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),tenant,principal,JSON.stringify({principal_id:principal,auth_revision:'1'}),correlationId,tenant]);
  }

  async replay(scope: TransactionScope, command: CommandIdentity, authorizeResponse: (response: CommandResponse) => Promise<void>): Promise<CommandResponse | undefined> {
    const hash=createHash('sha256').update(canonical({body:command.body,version:command.version ?? null})).digest('hex');
    await scope.query("DELETE FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=? AND status='completed' AND expires_at<=UTC_TIMESTAMP(6)",[scope.context.tenantId,command.actorId,command.route,command.key]);
    const rows=await scope.query("SELECT request_hash,status,response_status,response_body FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=?",[scope.context.tenantId,command.actorId,command.route,command.key]);
    if (rows[0]) {
      if (rows[0].request_hash!==hash) throw new CommandError(409,'IDEMPOTENCY_CONFLICT');
      if (rows[0].status!=='completed') throw new CommandError(409,'REQUEST_IN_PROGRESS');
      const response={status:Number(rows[0].response_status),body: typeof rows[0].response_body==='string' ? JSON.parse(rows[0].response_body) : rows[0].response_body};
      await authorizeResponse(response);
      return response;
    }
    await scope.query("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,created_at,updated_at) VALUES (?,?,'human',?,?,?,?,'pending',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),scope.context.tenantId,command.actorId,command.route,command.key,hash]);
  }
  async complete(scope: TransactionScope, command: CommandIdentity, response: CommandResponse) {
    await scope.query("UPDATE idempotency_record SET status='completed',response_status=?,response_body=?,expires_at=TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)),updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=?",[response.status,JSON.stringify(response.body),scope.context.tenantId,command.actorId,command.route,command.key]);
  }
  async audit(scope: TransactionScope, actorId: string, correlationId: string, resource: string, resourceId: string | null, action: string, fields: string[], outcome='accepted', reason: string | null=null) {
    await scope.query("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,resource_id,outcome,changed_fields,reason,correlation_id,occurred_at,created_at) VALUES (?,?,'human',?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),scope.context.tenantId,actorId,action,resource,resourceId,outcome,JSON.stringify(fields),reason,correlationId]);
  }
  async accessChanged(scope: TransactionScope, actorId: string, correlationId: string, principal: {id:string;version:string;auth_revision:string}) {
    await scope.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'principal.access_changed',1,'principal',?,?,?,?, 'human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),scope.context.tenantId,principal.id,principal.version,JSON.stringify({principal_id:principal.id,auth_revision:principal.auth_revision}),correlationId,actorId]);
  }
}
