import { hash as argonHash, verify, Algorithm } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';
import { AuthError } from './security.js';
// Offline deny-list v1. No network lookup receives a password.
const common = new Set(['passwordpassword', 'password123456789', '123456789012345', '1234567890123456', 'qwertyuiopasdfgh', 'correct horse battery staple', 'adminadminadmin', 'letmeinletmeinletmein']);
const options = { algorithm:Algorithm.Argon2id, memoryCost:19456, timeCost:2, parallelism:1, outputLen:32 };
let active=0;
async function bounded<T>(work:()=>Promise<T>):Promise<T> {
  if(active>=4)throw new AuthError(503,'AUTH_BUSY');
  active++;try{return await work();}finally{active--;}
}
export function passwordValid(value:unknown):value is string {
  return typeof value==='string' && [...value].length>=15 && [...value].length<=128 && Buffer.byteLength(value)<=512 && !common.has(value.toLowerCase());
}
export function loginKey(value:unknown):string {
  if(typeof value!=='string'||!/^[a-zA-Z0-9_.@-]{3,128}$/.test(value))throw new AuthError(400,'AUTH_REQUEST_INVALID');
  return value.toLowerCase();
}
export async function passwordHash(value:unknown) {
  if(!passwordValid(value))throw new AuthError(400,'AUTH_PASSWORD_POLICY');
  return bounded(()=>argonHash(value,options));
}
let dummy:Promise<string>|undefined;
export async function passwordMatches(encoded:string|null,value:string):Promise<boolean> {
  dummy??=argonHash(randomBytes(32),options);
  const candidate=encoded??await dummy;
  const result=await bounded(()=>verify(candidate,value));
  return encoded!==null&&result;
}
