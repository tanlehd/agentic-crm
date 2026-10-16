import {describe,it,expect} from 'vitest';
import {defaultRecordPage,type RecordPageView} from '@agentic-crm/contracts';
import {recordPageInput,chooseRecordPage,pageSurface} from '../src/modules/crm/record-pages.js';
const input=()=>({name:'Default view',team_ids:[],priority:100,layout:defaultRecordPage('detail',['display_name'])});
describe('record page configuration boundary',()=>{
  it('keeps independent detail and preview structures and exact input',()=>{
    expect(recordPageInput(input(),'detail').layout.tabs).toHaveLength(1);
    expect(recordPageInput({...input(),layout:defaultRecordPage('preview',[])},'preview').layout.tabs).toHaveLength(0);
    expect(()=>recordPageInput({...input(),tenant_id:'bad'},'detail')).toThrow();
    expect(()=>pageSurface('create')).toThrow();
  });
  it('rejects duplicate layout ids, unknown fields, executable payloads and unbounded cards',()=>{
    const b=input();b.layout.tabs[0]!.id=b.layout.left[0]!.id;expect(()=>recordPageInput(b,'detail')).toThrow();
    const bad=input();Object.assign(bad.layout.left[0]!,{script:'alert(1)'});expect(()=>recordPageInput(bad,'detail')).toThrow();
    const big=input();big.layout.left=Array.from({length:31},(_,i)=>({...big.layout.left[0]!,id:'card_'+i}));expect(()=>recordPageInput(big,'detail')).toThrow();
    expect(()=>recordPageInput({...input(),priority:1000},'detail')).toThrow();
    expect(()=>recordPageInput({...input(),team_ids:['not-a-uuid']},'detail')).toThrow();
  });
  it('rejects foreign regions on preview, empty detail tabs and malformed cards',()=>{
    expect(()=>recordPageInput(input(),'preview')).toThrow();
    const b=input();b.layout.tabs=[];expect(()=>recordPageInput(b,'detail')).toThrow();
    for(const patch of [{fields:['x.y']},{limit:100},{kind:'attachments'},{filter:{field:'display_name',value:'x'}},{fields:Array.from({length:51},(_,i)=>'f_'+i)}]){const b=input();Object.assign(b.layout.left[0]!,patch);expect(()=>recordPageInput(b,'detail')).toThrow();}
  });
  it('uses current viewer teams and stable priority/key tie break, never input order',()=>{
    const base:RecordPageView={...input(),key:'default',version:'0',updated_at:null,editable:true};
    const views=[base,{...base,key:'b',priority:10,team_ids:['t1']},{...base,key:'a',priority:10,team_ids:['t2']},{...base,key:'c',priority:20,team_ids:['t3']}];
    expect(chooseRecordPage(views,[]).key).toBe('default');
    expect(chooseRecordPage(views,['t1','t2','t3']).key).toBe('a');
    expect(chooseRecordPage([...views].reverse(),['t1','t2']).key).toBe('a');
    expect(chooseRecordPage(views,['t3']).key).toBe('c');
  });
});
