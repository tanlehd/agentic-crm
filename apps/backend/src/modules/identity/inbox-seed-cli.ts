import { databaseSource } from '../../kernel/database/data-source.js';
import { seedInbox } from './inbox-fixture.js';
const source=databaseSource(true);
try{await source.initialize();console.log(JSON.stringify(await seedInbox(source)));}
catch{console.error('INBOX_SEED_FAILED');process.exitCode=1;}finally{if(source.isInitialized)await source.destroy();}
