import { CommandError } from '../../kernel/reliability/commands.js';
import { fieldAllowed } from '../identity/domain/authorization.js';
import { withFieldPolicies,allows } from './access.js';
import { properties,json } from './properties.js';
import { standardQueries } from './core.js';
import type { CrmRecords } from './records.js';
export const standardDescriptors:Record<string,any[]>={
  contact:[{key:'display_name',label:'Tên liên hệ',type:'string',required:true},{key:'normalized_phone',label:'Số điện thoại (+84…)',type:'string'},{key:'normalized_email',label:'Email',type:'string'},{key:'contact_preference',label:'Ưu tiên liên hệ',type:'preference'}],
  company:[{key:'name',label:'Tên công ty',type:'string',required:true},{key:'domain',label:'Tên miền',type:'string'}],
  activity:[{key:'kind',label:'Loại hoạt động',type:'enum',required:true,options:['note','task','call'],immutable:true},{key:'subject',label:'Tiêu đề',type:'string',required:true},{key:'body',label:'Nội dung',type:'text'},{key:'due_at',label:'Hạn hoàn thành (UTC)',type:'datetime'},{key:'related_record_id',label:'Record liên quan',type:'reference',required:true,immutable:true}],
  lead:[{key:'qualification',label:'Qualification',type:'qualification'}],
};
export class CrmUi {
  constructor(private readonly records:CrmRecords){}
  context(account:string,tenant:string){return this.records.authorization.runHuman(account,tenant,async(scope,access)=>{
    const objects=await scope.query('SELECT id,`key`,label,kind,version FROM object_type WHERE tenant_id=? AND archived_at IS NULL ORDER BY kind DESC,label,id',[tenant]);
    return {principal_id:access.principalId,capabilities:access.capabilities,grants:access.grants,objects:objects.filter((o:any)=>allows(access,'schema','read')||access.capabilities.includes('read')&&access.grants.some(g=>g.resource===o.key&&g.action==='read')).map((o:any)=>({...o,version:String(o.version)}))};
  });}
  descriptor(account:string,tenant:string,key:string){return this.records.authorization.runHuman(account,tenant,async(scope,raw)=>{
    const access=await withFieldPolicies(scope,raw),type=await this.records.type(scope,key);
    if(!allows(access,'schema','read')&&!(access.capabilities.includes('read')&&access.grants.some(g=>g.resource===key&&g.action==='read')))throw new CommandError(403,'FORBIDDEN');
    const standard=(standardDescriptors[key]??[]).filter(f=>fieldAllowed(access,key,f.key,'read')).map(f=>({...f,indexed:!!standardQueries[key]?.some(p=>p.key===f.key),writable:fieldAllowed(access,key,f.key,'write')}));
    const custom=(await properties(scope,type.id)).filter(f=>fieldAllowed(access,key,f.key,'read')).map(f=>({...f,writable:fieldAllowed(access,key,f.key,'write')}));
    const [form]=await scope.query("SELECT fields FROM form_definition WHERE tenant_id=? AND object_type_id=? AND `key`='default'",[tenant,type.id]);
    const keys=[...standard,...custom].map(f=>f.key),order=form?(json(form.fields) as string[]).filter(k=>keys.includes(k)):keys;
    return {object_key:key,standard,custom,order};
  });}
}
