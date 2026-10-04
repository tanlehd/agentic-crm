import { databaseSource } from '../../kernel/database/data-source.js';
import { seedGuard } from '../identity/seed.js';
import { seedRegistry } from './seed.js';
let source:ReturnType<typeof databaseSource>|undefined;
try{seedGuard(process.env);source=databaseSource(true);await source.initialize();console.log(JSON.stringify(await seedRegistry(source)));}
catch{console.error('Registry fixture v2 failed. Check local schema and Identity fixture; no sensitive details logged.');process.exitCode=1;}
finally{if(source?.isInitialized)await source.destroy();}
