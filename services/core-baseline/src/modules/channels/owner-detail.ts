import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import {ownerFail,ownerRoute,type WorkloadRoute} from '@agentic-crm/workload-transport';

/** Channels-owned labels and immutable referral history, including disabled connections. */
export class NativeChannelDetail{
 constructor(private readonly pool:Pool){}
 async source(tenant:string,connection:string,conversation:string){
  const c=await this.pool.getConnection();
  try{
   await c.beginTransaction();const metadata=await this.snapshot(c,tenant,connection,conversation);
   const [[row]]=await c.execute<RowDataPacket[]>(`SELECT id FROM (
    SELECT id,received_at recorded_at FROM touchpoint WHERE tenant_id=? AND conversation_id=? AND connection_id=?
    UNION ALL
    SELECT id,created_at recorded_at FROM channel_ingress_touchpoint WHERE tenant_id=? AND conversation_id=? AND connection_id=? AND state='bound'
   ) sources ORDER BY recorded_at,id LIMIT 1`,[tenant,conversation,connection,tenant,conversation,connection]);
   await c.commit();return {...metadata,source_touchpoint_id:row?.id??null};
  }catch(error){await c.rollback();throw error;}finally{c.release();}
 }
 async read(tenant:string,connection:string,conversation:string){
  const result=await this.batch(tenant,[{connection_id:connection,conversation_id:conversation}]);return result.data[0]!.metadata;
 }
 async batch(tenant:string,items:{connection_id:string;conversation_id:string}[]){
  if(items.length>100||new Set(items.map(i=>i.conversation_id)).size!==items.length)ownerFail('INVALID_REQUEST');
  const c=await this.pool.getConnection();
  try{
   await c.beginTransaction();
   const data=[];for(const item of items)data.push({conversation_id:item.conversation_id,metadata:await this.snapshot(c,tenant,item.connection_id,item.conversation_id)});
   await c.commit();return {data};
  }catch(error){await c.rollback();throw error;}finally{c.release();}
 }
 private async snapshot(c:PoolConnection,tenant:string,connection:string,conversation:string){
   const [[row]]=await c.execute<RowDataPacket[]>('SELECT c.id,c.provider,c.external_account_id,p.name FROM channel_connection c LEFT JOIN facebook_page p ON p.tenant_id=c.tenant_id AND p.connection_id=c.id WHERE c.tenant_id=? AND c.id=?',[tenant,connection]);if(!row)ownerFail('NOT_FOUND');
   const [[source]]=await c.execute<RowDataPacket[]>(`SELECT source,ad_id,campaign_id FROM (
    SELECT id,received_at recorded_at,source,ad_id,campaign_id FROM touchpoint WHERE tenant_id=? AND conversation_id=? AND connection_id=?
    UNION ALL
    SELECT id,created_at recorded_at,'ctm' source,NULLIF(JSON_UNQUOTE(JSON_EXTRACT(evidence,'$.ad_id')),'null') ad_id,NULLIF(JSON_UNQUOTE(JSON_EXTRACT(evidence,'$.campaign_id')),'null') campaign_id FROM channel_ingress_touchpoint WHERE tenant_id=? AND conversation_id=? AND connection_id=? AND state='bound'
   ) sources ORDER BY recorded_at,id LIMIT 1`,[tenant,conversation,connection,tenant,conversation,connection]);
   return {channel:row.provider,channel_id:row.id,page_id:row.external_account_id,channel_name:row.name??row.external_account_id,attribution:source?{source:source.source,ad_id:source.ad_id,campaign_id:source.campaign_id}:{source:'unknown',ad_id:null,campaign_id:null}};
 }
}
export function channelDetailRoutes(detail:NativeChannelDetail):Record<string,WorkloadRoute>{return {'/internal/v1/owners/connector/source-channel-read':ownerRoute('connector','source-channel-read',['chat'],r=>detail.source(r.tenant_id,r.payload.connection_id as string,r.payload.conversation_id as string)),'/internal/v1/owners/connector/detail-channel-read':ownerRoute('connector','detail-channel-read',['chat'],r=>detail.read(r.tenant_id,r.payload.connection_id as string,r.payload.conversation_id as string)),'/internal/v1/owners/connector/detail-channel-batch':ownerRoute('connector','detail-channel-batch',['chat'],r=>detail.batch(r.tenant_id,r.payload.items as {connection_id:string;conversation_id:string}[]))};}
