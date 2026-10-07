import { createPool, type Pool, type PoolConnection, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { PLATFORM_TENANT_ID as system } from '../../../kernel/database/system-scope.js';
import { AuthError, hash, opaque, validOpaque, equal, SessionCrypto, IDLE_MS, ABSOLUTE_MS } from './security.js';
import { nativeConfig } from './native-config.js';
import { loginKey, passwordHash, passwordMatches } from './password.js';
export interface NativeSession { account_id:string; display_name:string; created_at:number; last_seen_at:number; absolute_expires_at:number }
export function nativePool() {
  for(const key of ['MYSQL_HOST','MYSQL_DATABASE','MYSQL_AUTH_USER','MYSQL_AUTH_PASSWORD'])if(!process.env[key])throw new Error('AUTH_DATABASE_CONFIG_REQUIRED');
  return createPool({host:process.env.MYSQL_HOST,port:Number(process.env.MYSQL_PORT??3306),database:process.env.MYSQL_DATABASE,user:process.env.MYSQL_AUTH_USER,password:process.env.MYSQL_AUTH_PASSWORD,connectionLimit:5,connectTimeout:3000,timezone:'Z',supportBigNumbers:true,bigNumberStrings:true});
}
export class NativeAuthService {
  readonly crypto:SessionCrypto;
  constructor(readonly config:ReturnType<typeof nativeConfig>,readonly pool:Pool,private readonly now=Date.now){this.crypto=new SessionCrypto(config.encryptionKey);}
  private async transaction<T>(work:(c:PoolConnection)=>Promise<T>):Promise<T>{
    const c=await this.pool.getConnection();try{await c.beginTransaction();const result=await work(c);await c.commit();return result;}catch(error){await c.rollback();throw error;}finally{c.release();}
  }
  private async audit(c:PoolConnection,action:string,account:string|null){await c.execute('INSERT INTO system_audit_entry(tenant_id,id,account_id,action,occurred_at) VALUES (?,?,?,?,?)',[system,randomUUID(),account,action,this.now()]);}
  private async budget(key:string,limit:number){
    const count=await this.transaction(async c=>{
      const now=this.now(),cutoff=now-900_000,bucket=hash(key);
      await c.execute('INSERT INTO auth_attempt(tenant_id,bucket_hash,window_start,attempts) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE attempts=IF(window_start<=?,1,attempts+1),window_start=IF(window_start<=?,?,window_start)',[system,bucket,now,cutoff,cutoff,now]);
      const [rows]=await c.execute<RowDataPacket[]>('SELECT attempts FROM auth_attempt WHERE tenant_id=? AND bucket_hash=?',[system,bucket]);return Number(rows[0]!.attempts);
    });
    if(count>limit)throw new AuthError(429,'AUTH_RATE_LIMITED');
  }
  async challenge(ip:string){
    await this.budget(`challenge:${ip}`,60);
    const token=opaque(),browser=opaque();
    await this.pool.execute('INSERT INTO auth_challenge(tenant_id,token_hash,browser_hash,expires_at) VALUES (?,?,?,?)',[system,hash(token),hash(browser),this.now()+600_000]);
    return {token,browser};
  }
  requireOrigin(origin:unknown){if(origin!==this.config.origin)throw new AuthError(403,'AUTH_CSRF_INVALID');}
  async login(keyInput:unknown,password:unknown,challenge:unknown,browser:unknown,origin:unknown,ip:string,oldId?:string){
    this.requireOrigin(origin);
    const key=loginKey(keyInput);
    if(typeof password!=='string'||Buffer.byteLength(password)>512||[...password].length>128||!validOpaque(challenge)||!validOpaque(browser))throw new AuthError(400,'AUTH_REQUEST_INVALID');
    const [consumed]=await this.pool.execute<ResultSetHeader>('DELETE FROM auth_challenge WHERE tenant_id=? AND token_hash=? AND browser_hash=? AND expires_at>?',[system,hash(challenge),hash(browser),this.now()]);
    if(consumed.affectedRows!==1)throw new AuthError(403,'AUTH_CSRF_INVALID');
    await this.budget(`login-ip:${ip}`,30);await this.budget(`login-key:${key}`,5);
    const [rows]=await this.pool.execute<RowDataPacket[]>('SELECT a.id,a.native_status,a.security_revision,c.password_hash,c.version FROM account a LEFT JOIN account_credential c ON c.tenant_id=a.tenant_id AND c.account_id=a.id WHERE a.tenant_id=? AND a.login_key=?',[system,key]);
    const account=rows[0];
    const matches=await passwordMatches(account?.password_hash??null,password);
    if(!account||!matches||account.native_status!=='active'){
      await this.transaction(c=>this.audit(c,'login_denied',account?.id??null));throw new AuthError(401,'AUTH_LOGIN_INVALID');
    }
    const id=opaque();
    await this.transaction(async c=>{
      const [current]=await c.execute<RowDataPacket[]>('SELECT native_status,security_revision FROM account WHERE tenant_id=? AND id=? FOR UPDATE',[system,account.id]);
      if(current[0]?.native_status!=='active'||String(current[0].security_revision)!==String(account.security_revision))throw new AuthError(401,'AUTH_LOGIN_INVALID');
      const [credentials]=await c.execute<RowDataPacket[]>('SELECT version FROM account_credential WHERE tenant_id=? AND account_id=?',[system,account.id]);
      if(String(credentials[0]?.version)!==String(account.version))throw new AuthError(401,'AUTH_LOGIN_INVALID');
      const now=this.now();
      if(validOpaque(oldId))await c.execute('UPDATE auth_session SET revoked_at=? WHERE tenant_id=? AND token_hash=? AND revoked_at IS NULL',[now,system,hash(oldId)]);
      await c.execute('INSERT INTO auth_session(tenant_id,token_hash,account_id,security_revision,created_at,last_seen_at,absolute_expires_at) VALUES (?,?,?,?,?,?,?)',[system,hash(id),account.id,account.security_revision,now,now,now+ABSOLUTE_MS]);
      await c.execute('DELETE FROM auth_attempt WHERE tenant_id=? AND bucket_hash=?',[system,hash(`login-key:${key}`)]);
      await this.audit(c,'login_succeeded',account.id);
    });
    return id;
  }
  async session(id:unknown,touch=false):Promise<NativeSession>{
    if(!validOpaque(id))throw new AuthError(401,'AUTH_SESSION_REQUIRED');
    const now=this.now();
    const [rows]=await this.pool.execute<RowDataPacket[]>(`SELECT s.account_id,a.display_name,s.created_at,s.last_seen_at,s.absolute_expires_at FROM auth_session s JOIN account a ON a.tenant_id=s.tenant_id AND a.id=s.account_id WHERE s.tenant_id=? AND s.token_hash=? AND s.revoked_at IS NULL AND s.absolute_expires_at>? AND s.last_seen_at>? AND a.native_status='active' AND a.security_revision=s.security_revision`,[system,hash(id),now,now-IDLE_MS]);
    const row=rows[0];if(!row)throw new AuthError(401,'AUTH_SESSION_REQUIRED');
    if(touch){
      // Conditional update never recreates or revives a revoked/expired session.
      const [result]=await this.pool.execute<ResultSetHeader>(`UPDATE auth_session s JOIN account a ON a.tenant_id=s.tenant_id AND a.id=s.account_id SET s.last_seen_at=GREATEST(s.last_seen_at,?) WHERE s.tenant_id=? AND s.token_hash=? AND s.revoked_at IS NULL AND s.absolute_expires_at>? AND s.last_seen_at>? AND a.native_status='active' AND a.security_revision=s.security_revision`,[now,system,hash(id),now,now-IDLE_MS]);
      if(!result.affectedRows)throw new AuthError(401,'AUTH_SESSION_REQUIRED');
    }
    return {account_id:row.account_id,display_name:row.display_name,created_at:Number(row.created_at),last_seen_at:touch?Math.max(now,Number(row.last_seen_at)):Number(row.last_seen_at),absolute_expires_at:Number(row.absolute_expires_at)};
  }
  async csrf(id:unknown){await this.session(id);return this.crypto.csrf(id as string);}
  async requireMutation(id:unknown,origin:unknown,csrf:unknown){
    this.requireOrigin(origin);
    if(!validOpaque(id)||typeof csrf!=='string'||csrf.length>128||!equal(csrf,this.crypto.csrf(id)))throw new AuthError(403,'AUTH_CSRF_INVALID');
    return this.session(id,true);
  }
  async logout(id:unknown,origin:unknown,csrf:unknown){
    const session=await this.requireMutation(id,origin,csrf);
    await this.transaction(async c=>{await c.execute('UPDATE auth_session SET revoked_at=? WHERE tenant_id=? AND token_hash=? AND revoked_at IS NULL',[this.now(),system,hash(id as string)]);await this.audit(c,'logout',session.account_id);});
  }
  async changePassword(id:unknown,origin:unknown,csrf:unknown,current:unknown,next:unknown){
    const session=await this.requireMutation(id,origin,csrf);
    if(typeof current!=='string'||Buffer.byteLength(current)>512||[...current].length>128)throw new AuthError(400,'AUTH_REQUEST_INVALID');
    await this.budget(`password-change:${session.account_id}`,5);
    const [rows]=await this.pool.execute<RowDataPacket[]>('SELECT password_hash,version FROM account_credential WHERE tenant_id=? AND account_id=?',[system,session.account_id]);
    if(!await passwordMatches(rows[0]?.password_hash??null,current))throw new AuthError(401,'AUTH_LOGIN_INVALID');
    const encoded=await passwordHash(next);
    await this.transaction(async c=>{
      await c.execute('SELECT id FROM account WHERE tenant_id=? AND id=? FOR UPDATE',[system,session.account_id]);
      const now=this.now();
      const [active]=await c.execute<RowDataPacket[]>(`SELECT s.account_id FROM auth_session s JOIN account a ON a.tenant_id=s.tenant_id AND a.id=s.account_id WHERE s.tenant_id=? AND s.token_hash=? AND s.revoked_at IS NULL AND s.absolute_expires_at>? AND s.last_seen_at>? AND a.native_status='active' AND a.security_revision=s.security_revision FOR UPDATE`,[system,hash(id as string),now,now-IDLE_MS]);
      if(!active.length)throw new AuthError(401,'AUTH_SESSION_REQUIRED');
      const [result]=await c.execute<ResultSetHeader>('UPDATE account_credential SET password_hash=?,version=version+1,changed_at=? WHERE tenant_id=? AND account_id=? AND version=?',[encoded,this.now(),system,session.account_id,rows[0]!.version]);
      if(result.affectedRows!==1)throw new AuthError(409,'AUTH_CREDENTIAL_CHANGED');
      await this.revoke(c,session.account_id);await this.audit(c,'password_changed',session.account_id);
    });
  }
  private async revoke(c:PoolConnection,account:string){
    await c.execute('UPDATE account SET security_revision=security_revision+1 WHERE tenant_id=? AND id=?',[system,account]);
    await c.execute('UPDATE auth_session SET revoked_at=? WHERE tenant_id=? AND account_id=? AND revoked_at IS NULL',[this.now(),system,account]);
  }
  // Operator-only method: not exposed by a public HTTP endpoint.
  async issueRecovery(account:string,purpose:'reset'|'enrollment'){
    const token=opaque();
    await this.transaction(async c=>{
      const [rows]=await c.execute<RowDataPacket[]>('SELECT security_revision,native_status,login_key FROM account WHERE tenant_id=? AND id=? FOR UPDATE',[system,account]);
      if(rows[0]?.native_status!=='active'||!rows[0]?.login_key)throw new AuthError(400,'AUTH_ACCOUNT_INVALID');
      await c.execute('INSERT INTO auth_token(tenant_id,token_hash,account_id,purpose,security_revision,expires_at) VALUES (?,?,?,?,?,?)',[system,hash(token),account,purpose,rows[0].security_revision,this.now()+900_000]);
      await this.audit(c,'recovery_issued',account);
    });return token;
  }
  async resetPassword(token:unknown,next:unknown,origin:unknown,ip:string){
    this.requireOrigin(origin);if(!validOpaque(token))throw new AuthError(400,'AUTH_TOKEN_INVALID');
    await this.budget(`reset:${ip}`,30);const encoded=await passwordHash(next);
    await this.transaction(async c=>{
      // Account lock precedes token lock to share lock order with issuance/change.
      const [lookup]=await c.execute<RowDataPacket[]>('SELECT account_id FROM auth_token WHERE tenant_id=? AND token_hash=?',[system,hash(token)]);
      if(!lookup[0])throw new AuthError(400,'AUTH_TOKEN_INVALID');const account=lookup[0].account_id;
      const [accounts]=await c.execute<RowDataPacket[]>('SELECT security_revision,native_status FROM account WHERE tenant_id=? AND id=? FOR UPDATE',[system,account]);
      const [rows]=await c.execute<RowDataPacket[]>('SELECT security_revision,expires_at,consumed_at FROM auth_token WHERE tenant_id=? AND token_hash=? FOR UPDATE',[system,hash(token)]);
      const row=rows[0];if(!row||row.consumed_at!==null||Number(row.expires_at)<=this.now()||accounts[0]?.native_status!=='active'||String(accounts[0].security_revision)!==String(row.security_revision))throw new AuthError(400,'AUTH_TOKEN_INVALID');
      await c.execute('INSERT INTO account_credential(tenant_id,account_id,password_hash,changed_at) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE password_hash=?,version=version+1,changed_at=?',[system,account,encoded,this.now(),encoded,this.now()]);
      await c.execute('UPDATE auth_token SET consumed_at=? WHERE tenant_id=? AND token_hash=?',[this.now(),system,hash(token)]);
      await this.revoke(c,account);await this.audit(c,'password_reset',account);
    });
  }
}
