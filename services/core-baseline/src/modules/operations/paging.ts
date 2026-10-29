import { CommandError } from '../../kernel/reliability/commands.js';
import { uuid } from '../identity/admin.js';
export function page(query:Record<string,unknown>,extra:string[]=[]){
 if(Object.keys(query).some(k=>!['limit','cursor',...extra].includes(k))||query.cursor!==undefined&&!uuid(query.cursor)||query.limit!==undefined&&(typeof query.limit!=='string'||!/^\d{1,2}$/.test(query.limit)))throw new CommandError(400,'INVALID_REQUEST');
 const limit=Number(query.limit??25);if(limit<1||limit>50)throw new CommandError(400,'INVALID_REQUEST');return {limit,cursor:String(query.cursor??'')};
}
