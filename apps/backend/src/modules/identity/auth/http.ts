import { Controller, Get, Post, Req, Res, Inject, Module } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { AuthError, returnPath, ABSOLUTE_MS, IDLE_MS } from './security.js';
import { NativeAuthService, nativePool } from './native-service.js';
import { nativeConfig } from './native-config.js';
import { loginKey } from './password.js';
interface Request extends IncomingMessage { query:Record<string,unknown>; body:unknown }
export function cookie(req:IncomingMessage,name:string):string|undefined {
  const matches=(req.headers.cookie??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(`${name}=`));return matches.length===1?matches[0]!.slice(name.length+1):undefined;
}
export class AuthRuntime implements OnModuleDestroy {
  readonly service=new NativeAuthService(nativeConfig(),nativePool());
  async onModuleDestroy(){await this.service.pool.end();}
}
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthRuntime)private readonly runtime:AuthRuntime){}
  private get auth(){return this.runtime.service;}
  private cookie(name:string,value:string,seconds:number){return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${this.auth.config.secure?'; Secure':''}`;}
  private body(req:Request,keys:string[]):Record<string,unknown>{
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')||Object.keys(req.query).length||!req.body||typeof req.body!=='object'||Array.isArray(req.body))throw new AuthError(400,'AUTH_REQUEST_INVALID');
    const body=req.body as Record<string,unknown>;if(Object.keys(body).length!==keys.length||keys.some(key=>!Object.hasOwn(body,key))||Object.keys(body).some(key=>!keys.includes(key)))throw new AuthError(400,'AUTH_REQUEST_INVALID');return body;
  }
  private async respond(res:ServerResponse,fn:(correlation:string)=>Promise<void>){
    const correlation=randomUUID();res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
    try{await fn(correlation);}catch(error){const failure=error instanceof AuthError?error:new AuthError(503,'AUTH_UNAVAILABLE');if(failure.status===401)res.setHeader('Set-Cookie',this.cookie('crm_session','',0));if(failure.status===429)res.setHeader('Retry-After','900');res.statusCode=failure.status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:{code:failure.code,message:'Không thể hoàn tất xác thực. Vui lòng thử lại.',fields:[],retryable:[429,503].includes(failure.status)},meta:{correlation_id:correlation}}));}
  }
  @Get('login') loginPage(@Req()req:Request,@Res()res:ServerResponse){return this.respond(res,async()=>{const path=returnPath(req.query.return_to);res.statusCode=302;res.setHeader('Location',`/login?return_to=${encodeURIComponent(path)}`);res.end();});}
  @Get('callback') callback(@Res()res:ServerResponse){return this.respond(res,async()=>{throw new AuthError(410,'AUTH_LEGACY_DISABLED');});}
  @Get('login-challenge') challenge(@Req()req:Request,@Res()res:ServerResponse){return this.respond(res,async correlation=>{
    const result=await this.auth.challenge(req.socket.remoteAddress??'unknown');res.setHeader('Set-Cookie',this.cookie('crm_login',result.browser,600));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:{csrf_token:result.token},meta:{correlation_id:correlation}}));
  });}
  @Post('login') login(@Req()req:Request,@Res()res:ServerResponse){return this.respond(res,async()=>{
    const body=this.body(req,['login_key','password','csrf_token']);const id=await this.auth.login(body.login_key,body.password,body.csrf_token,cookie(req,'crm_login'),req.headers.origin,req.socket.remoteAddress??'unknown',cookie(req,'crm_session'));
    res.setHeader('Set-Cookie',[this.cookie('crm_login','',0),this.cookie('crm_session',id,ABSOLUTE_MS/1000)]);res.statusCode=204;res.end();
  });}
  @Get('session') session(@Req()req:Request,@Res()res:ServerResponse){return this.respond(res,async correlation=>{
    const s=await this.auth.session(cookie(req,'crm_session'),true);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:{account_id:s.account_id,display_name:s.display_name,expires_at:new Date(Math.min(s.last_seen_at+IDLE_MS,s.absolute_expires_at)).toISOString()},meta:{correlation_id:correlation}}));
  });}
  @Get('csrf') csrf(@Req()req:Request,@Res()res:ServerResponse){return this.respond(res,async correlation=>{const token=await this.auth.csrf(cookie(req,'crm_session'));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:{csrf_token:token},meta:{correlation_id:correlation}}));});}
  @Post('logout') logout(@Req()req:Request,@Res()res:ServerResponse){return this.respond(res,async()=>{await this.auth.logout(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token']);res.setHeader('Set-Cookie',this.cookie('crm_session','',0));res.statusCode=204;res.end();});}
  @Post('password/change') change(@Req()req:Request,@Res()res:ServerResponse){return this.respond(res,async()=>{const body=this.body(req,['current_password','new_password']);await this.auth.changePassword(cookie(req,'crm_session'),req.headers.origin,req.headers['x-csrf-token'],body.current_password,body.new_password);res.setHeader('Set-Cookie',this.cookie('crm_session','',0));res.statusCode=204;res.end();});}
  @Post('password/reset-request') recovery(@Req()req:Request,@Res()res:ServerResponse){return this.respond(res,async()=>{this.auth.requireOrigin(req.headers.origin);const body=this.body(req,['login_key']);loginKey(body.login_key);throw new AuthError(503,'AUTH_RECOVERY_UNAVAILABLE');});}
  @Post('password/reset-complete') reset(@Req()req:Request,@Res()res:ServerResponse){return this.respond(res,async()=>{const body=this.body(req,['token','new_password']);await this.auth.resetPassword(body.token,body.new_password,req.headers.origin,req.socket.remoteAddress??'unknown');res.setHeader('Set-Cookie',this.cookie('crm_session','',0));res.statusCode=204;res.end();});}
}
@Module({controllers:[AuthController],providers:[AuthRuntime],exports:[AuthRuntime]})
export class AuthModule {}
