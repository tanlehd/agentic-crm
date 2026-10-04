import { databaseSource } from '../../kernel/database/data-source.js';
import { seedGuard } from '../identity/seed.js';
import { seedM1 } from './m1-seed.js';
let source:ReturnType<typeof databaseSource>|undefined;
try{seedGuard(process.env);source=databaseSource(true);await source.initialize();console.log(JSON.stringify(await seedM1(source)));}
catch{console.error('M1 fixture v3 failed. Check local Identity/registry prerequisites; details suppressed.');process.exitCode=1;}
finally{if(source?.isInitialized)await source.destroy();}
