import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerCommandBinding} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,OwnerDomainError} from '@agentic-crm/workload-transport';

export type TransitionResponse={data:Record<string,unknown>;meta:{correlation_id:string}};
export const transitionRoute=(id:string)=>`POST /api/v1/conversations/${id}/transition`;
export async function transitionReceipt(c:PoolConnection,b:OwnerCommandBinding,payload:Record<string,unknown>):Promise<TransitionResponse|null>{
 const [[row]]=await c.execute<RowDataPacket[]>("SELECT request_hash,status,response_body FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=? FOR UPDATE",[b.tenant_id,b.actor.principal_id,transitionRoute(b.resource.resource_id),payload.idempotency_key as string]);
 if(!row)return null;
 if(row.request_hash!==ownerDigest({body:payload.body,version:payload.expected_version??null}))throw new OwnerDomainError('IDEMPOTENCY_CONFLICT',b.command_id);
 if(row.status!=='completed')ownerFail('DEPENDENCY_UNAVAILABLE');
 return typeof row.response_body==='string'?JSON.parse(row.response_body):row.response_body;
}
export async function saveTransitionReceipt(c:PoolConnection,b:OwnerCommandBinding,payload:Record<string,unknown>,response:TransitionResponse){
 await c.execute("INSERT INTO idempotency_record(id,tenant_id,actor_kind,actor_id,route_key,`key`,request_hash,status,response_status,response_body,created_at,updated_at,expires_at) VALUES (?,?,'human',?,?,?,?,'completed',200,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",[randomUUID(),b.tenant_id,b.actor.principal_id,transitionRoute(b.resource.resource_id),payload.idempotency_key as string,ownerDigest({body:payload.body,version:payload.expected_version??null}),ownerCanonical(response)]);
}
