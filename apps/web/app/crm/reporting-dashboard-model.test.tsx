import {describe,it,expect} from 'vitest';
import {editableDashboard} from './reporting-dashboard-model';
import {inboxDemoDashboards} from '../../../../services/reporting/src/inbox-demo';
const dashboard=()=>inboxDemoDashboards('01900000-0000-7000-8000-000000000031','a'.repeat(64))[0]!.definition;
describe('stored dashboard document boundary',()=>{
 it('preserves supported pinned definitions and permits an empty new dashboard',()=>{expect(editableDashboard(dashboard())).toBe(true);expect(editableDashboard({...dashboard(),widgets:[]})).toBe(true);});
 it('refuses future, unpinned, duplicate, oversized and embedded-result documents',()=>{
  const d=dashboard(),w=d.widgets[0]!;
  for(const value of [null,{...d,kind:'report'},{...d,schemaVersion:2},{...d,result:{}},{...d,description:'x'.repeat(4001)},{...d,widgets:[null]},{...d,widgets:[w,w]},{...d,widgets:Array.from({length:13},(_,i)=>({...w,id:'w'+i}))},...[{generation:''},{generation:'future'},{definition:{future:true}},{result:{}},{title:''}].map(p=>({...d,widgets:[{...w,...p}]}))])expect(editableDashboard(value)).toBe(false);
 });
});
