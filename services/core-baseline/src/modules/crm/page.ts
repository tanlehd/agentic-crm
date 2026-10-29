import { createHmac,timingSafeEqual } from 'node:crypto';
import { canonical,CommandError } from '../../kernel/reliability/commands.js';
import { uuid,type PageQuery } from '../identity/admin.js';
interface Position {at:string;id:string}
export function page(query:PageQuery, binding:unknown, cursorSecret:string|Buffer) {
    const limit=query.limit===undefined ? 50 : Number(query.limit);
    if (!Number.isInteger(limit) || limit<1 || limit>100 || typeof query.limit==='object') throw new CommandError(400,'INVALID_REQUEST');
    let position:Position|undefined;
    if (query.cursor!==undefined) {
      if (typeof query.cursor!=='string' || query.cursor.length>4096) throw new CommandError(400,'INVALID_CURSOR');
      const [payload,signature,...extra]=query.cursor.split('.');
      const expected=createHmac('sha256',cursorSecret).update(payload ?? '').digest('base64url');
      if (!signature || extra.length || signature.length!==expected.length || !timingSafeEqual(Buffer.from(signature),Buffer.from(expected))) throw new CommandError(400,'INVALID_CURSOR');
      try {
        const decoded=JSON.parse(Buffer.from(payload!,'base64url').toString());
        if (canonical(decoded.binding)!==canonical(binding) || !uuid(decoded.position.id) || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(decoded.position.at)) throw new Error();
        position=decoded.position;
      } catch {throw new CommandError(400,'INVALID_CURSOR');}
    }
    return {limit,position,next:(row: any)=>{
      const payload=Buffer.from(JSON.stringify({binding,position:{at:row.position,id:row.id}})).toString('base64url');
      return `${payload}.${createHmac('sha256',cursorSecret).update(payload).digest('base64url')}`;
    }};
  }
