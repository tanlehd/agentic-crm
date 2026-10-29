import { databaseSource } from '../../kernel/database/data-source.js';
import { seedRouting } from './routing-fixture.js';
const source=databaseSource(true);
try{await source.initialize();console.log(JSON.stringify(await seedRouting(source)));}
catch{console.error('ROUTING_SEED_FAILED');process.exitCode=1;}finally{if(source.isInitialized)await source.destroy();}
