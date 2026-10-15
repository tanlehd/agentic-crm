import {describe,it,expect} from 'vitest';
import {packWidgets,dashboardContent,type Dashboard,type DashboardWidget} from './dashboard-model';
const widget=(id:string,w:number,h:number):DashboardWidget=>({id,reportId:'report-'+id,reportVersion:'3',bindingId:'source',generationId:'snapshot',titleOverride:null,note:'',layout:{x:0,y:0,w,h}});
describe('dashboard reference layout',()=>{
 it('packs mixed sizes without overlap and preserves immutable report/snapshot pins',()=>{
  const original=[widget('a',6,3),widget('b',6,5),widget('c',4,4),widget('d',12,3)];const packed=packWidgets(original);
  expect(packed.map(w=>w.layout)).toEqual([{x:0,y:0,w:6,h:3},{x:6,y:0,w:6,h:5},{x:0,y:5,w:4,h:4},{x:0,y:9,w:12,h:3}]);
  expect(original[1]!.layout.x).toBe(0);expect(packed.map(w=>w.reportVersion)).toEqual(['3','3','3','3']);
 });
 it('serializes references only, never query results or report definitions',()=>{
  const w={...widget('a',12,4),reportName:'Private metadata',definition:{secret:'never serialize'},result:{value:42}};
  const body=dashboardContent({name:' Dashboard ',description:'Notes',widgets:[w]} as unknown as Dashboard);
  expect(body.name).toBe('Dashboard');expect(body.widgets[0]).toEqual(widget('a',12,4));expect(JSON.stringify(body)).not.toContain('secret');
 });
});
