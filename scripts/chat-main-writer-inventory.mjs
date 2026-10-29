import {writeFile} from 'node:fs/promises';
import {mainWriterInventory} from './lib/chat-main-fence.mjs';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
const {accounts,sessions}=mainWriterInventory();
const report={purpose:'read-only-main-writer-inventory',accounts:accounts.map(a=>({...a,sessions:sessions.filter(s=>s.user===a.user).length}))};
await writeFile((await mainEvidenceDirectory())+'/main-writers.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
