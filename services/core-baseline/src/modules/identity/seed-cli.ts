import { databaseSource } from '../../kernel/database/data-source.js';
import { seedGuard, seedIdentity, type SeedInput } from './seed.js';
let source: ReturnType<typeof databaseSource> | undefined;
try {
  seedGuard(process.env);
  let body='';for await(const chunk of process.stdin){body+=chunk;if(body.length>8192)throw new Error('SEED_INPUT_TOO_LARGE');}
  const input=JSON.parse(body) as SeedInput;
  source=databaseSource(true);await source.initialize();
  console.log(JSON.stringify(await seedIdentity(source,input)));
} catch {console.error('Identity seed failed; inspect local configuration, schema and fixture mapping. Sensitive details suppressed.');process.exitCode=1;}
finally{if(source?.isInitialized)await source.destroy();}
