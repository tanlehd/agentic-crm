import {randomUUID} from 'node:crypto';
import type {RowDataPacket} from 'mysql2/promise';
import {chatWorkerJobs,type composeChat,type ChatCompositionConfig} from './composition.js';

export class ChatWorker{
 private running=false;private stopped=false;private readonly cursors=new Map<string,string>();
 readonly metrics={rounds:0,failures:0,ingressAttempted:0,eventsAcknowledged:0,lastSuccess:0};
 readonly jobs:readonly typeof chatWorkerJobs[number][];
 constructor(private readonly runtime:ReturnType<typeof composeChat>,private readonly config:ChatCompositionConfig){this.jobs=config.workerJobs??chatWorkerJobs;}
 stop(){this.stopped=true;}
 private async ingress(){
  for(const tenant of this.config.tenants){
   if(this.stopped)return;
   const rows=await this.runtime.commands.transaction(tenant,async c=>{
    const [rows]=await c.execute<RowDataPacket[]>("SELECT id,binding_json FROM chat_ingress_inbox WHERE tenant_id=? AND state='received' AND id>? ORDER BY id LIMIT 1",[tenant,this.cursors.get(tenant)??'']);return rows;
   });
   if(!rows.length){this.cursors.delete(tenant);continue;}
   for(const row of rows){if(this.stopped)return;this.cursors.set(tenant,String(row.id));this.metrics.ingressAttempted++;
    try{await this.runtime.ingress.process({schema_version:1,request_id:randomUUID(),operation:'ingress-read',binding:typeof row.binding_json==='string'?JSON.parse(row.binding_json):row.binding_json,receipt_id:row.id});}catch{this.metrics.failures++;}
   }
  }
 }
 async tick(){
  if(this.running||this.stopped)return;this.running=true;let success=true;
  try{
   const steps={ingress:()=>this.ingress(),outbound:()=>this.runtime.outbound.tick(this.config.tenants,1),snooze:()=>this.runtime.workspace.tick(this.config.tenants),recovery:()=>this.runtime.recovery.tick(1),events:async()=>{const r=await this.runtime.events.tick(1);this.metrics.eventsAcknowledged+=r.acknowledged;},activity:()=>this.runtime.activityRecovery.tick(1)};
   for(const job of this.jobs){if(this.stopped)break;try{await steps[job]();}catch{success=false;this.metrics.failures++;}}
   this.metrics.rounds++;if(success&&!this.stopped)this.metrics.lastSuccess=Date.now();
  }finally{this.running=false;}
 }
}
