import {readFile} from 'node:fs/promises';
import type {TlsMaterial,ServiceName} from './workload-tls.js';
import {localHttpKeys} from './local-http.js';
export function required(env:NodeJS.ProcessEnv,key:string):string {
  const value=env[key];if(!value)throw new Error('WORKLOAD_CONFIGURATION_REQUIRED');return value;
}
export async function workloadMaterial(service:ServiceName,env:NodeJS.ProcessEnv=process.env):Promise<TlsMaterial>{
  const mode=env.WORKLOAD_TRANSPORT??'tls';
  if(mode==='http-local'){
    if(!['development','test'].includes(env.APP_ENV??''))throw new Error('LOCAL_HTTP_ENVIRONMENT_REQUIRED');
    const localHttp=localHttpKeys(JSON.parse(await readFile(required(env,'WORKLOAD_HTTP_KEYS_FILE'),'utf8')));
    if(!localHttp[service])throw new Error('WORKLOAD_CONFIGURATION_REQUIRED');
    return {service,ca:'',cert:'',key:'',localHttp};
  }
  if(mode!=='tls')throw new Error('WORKLOAD_TRANSPORT_INVALID');
  return {service,ca:await readFile(required(env,'WORKLOAD_CA_FILE')),cert:await readFile(required(env,'WORKLOAD_CERT_FILE')),key:await readFile(required(env,'WORKLOAD_KEY_FILE'))};
}
export async function registryConfig(env:NodeJS.ProcessEnv=process.env){
  return {url:new URL(required(env,'WORKLOAD_REGISTRY_URL')),keyId:required(env,'WORKLOAD_AUTHORITY_KEY_ID'),publicKey:await readFile(required(env,'WORKLOAD_AUTHORITY_PUBLIC_KEY_FILE'))};
}
