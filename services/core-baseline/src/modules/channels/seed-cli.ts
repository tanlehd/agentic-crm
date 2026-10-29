import { databaseSource } from '../../kernel/database/data-source.js';
import { seedChannels } from './seed.js';
const source=databaseSource(true);
try{let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>1024)throw new Error('INPUT_LIMIT');}const tokens=JSON.parse(input);await source.initialize();console.log(JSON.stringify(await seedChannels(source,tokens)));}
catch{console.error('CHANNEL_SEED_FAILED');process.exitCode=1;}finally{if(source.isInitialized)await source.destroy();}
