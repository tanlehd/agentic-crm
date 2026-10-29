import {CommandError} from '../../kernel/reliability/commands.js';
import {uuid} from '../identity/admin.js';
import {object} from '../crm/properties.js';
export type HumanRoutingCommand='skills'|'team-skills'|'profiles'|'queues'|'reroute';
const name=(v:unknown)=>typeof v==='string'&&v.trim().length>0&&v.length<=120;
const ids=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=200&&v.every(uuid)&&new Set(v).size===v.length;
export function humanRoutingInput(kind:HumanRoutingCommand,input:unknown){
 const keys={skills:['key','name'],'team-skills':['team_id','skill_ids'],profiles:['principal_id','capacity','enabled'],queues:['id','name','team_id','connection_id','skill_ids','priority','enabled'],reroute:['work_id','queue_id','owner_principal_id']};
 const b=object(input,keys[kind]);let valid=false;
 if(kind==='skills')valid=name(b.name)&&typeof b.key==='string'&&/^[a-z][a-z0-9_.-]{0,63}$/.test(b.key);
 if(kind==='team-skills')valid=uuid(b.team_id)&&ids(b.skill_ids);
 if(kind==='profiles')valid=uuid(b.principal_id)&&Number.isInteger(b.capacity)&&b.capacity>=0&&b.capacity<=100&&typeof b.enabled==='boolean';
 if(kind==='queues')valid=(b.id===undefined||uuid(b.id))&&name(b.name)&&uuid(b.team_id)&&(b.connection_id===null||uuid(b.connection_id))&&ids(b.skill_ids)&&Number.isInteger(b.priority)&&b.priority>=0&&b.priority<=999&&typeof b.enabled==='boolean';
 if(kind==='reroute')valid=uuid(b.work_id)&&uuid(b.queue_id)&&(b.owner_principal_id===null||uuid(b.owner_principal_id));
 if(!valid)throw new CommandError(400,'INVALID_REQUEST');return b;
}
