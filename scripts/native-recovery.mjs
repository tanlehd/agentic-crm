// Local operator only. Account UUID enters on stdin; token never enters stdout/argv.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { nativePool,NativeAuthService } from '../apps/backend/dist/modules/identity/auth/native-service.js';
import { nativeConfig } from '../apps/backend/dist/modules/identity/auth/native-config.js';
const env=parseEnv(await readFile('.local/services/api.env','utf8'));
if(env.APP_ENV!=='development'||env.MYSQL_HOST!=='127.0.0.1'||env.MYSQL_DATABASE!=='agentic_crm')throw new Error('LOCAL_OPERATOR_ONLY');
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>128)throw new Error('ACCOUNT_UUID_REQUIRED');}
const account=input.trim();if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(account))throw new Error('ACCOUNT_UUID_REQUIRED');
Object.assign(process.env,env);const pool=nativePool();
try{
 const token=await new NativeAuthService(nativeConfig(),pool).issueRecovery(account,'reset');
 await mkdir('.local/recovery',{recursive:true});const path=`.local/recovery/${randomUUID()}.txt`;
 await writeFile(path,token,{flag:'wx',mode:0o600});console.log(`One-use token saved to ${path}; expires in 15 minutes. Deliver privately, then delete this file.`);
}catch{console.error('Recovery issuance failed; verify account and local configuration.');process.exitCode=1;}finally{await pool.end();}
