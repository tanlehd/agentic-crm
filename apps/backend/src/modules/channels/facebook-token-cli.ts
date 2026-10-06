import { databaseSource } from '../../kernel/database/data-source.js';
import { FacebookChannels } from './facebook.js';
import { facebookConfig } from './facebook-graph.js';
let source:ReturnType<typeof databaseSource>|undefined;
try{
 if(!['development','test'].includes(process.env.APP_ENV??''))throw new Error();
 const [tenant,connection,...extra]=process.argv.slice(2);if(!tenant||!connection||extra.length||process.stdin.isTTY)throw new Error();
 let token='';for await(const part of process.stdin){token+=part.toString();if(token.length>16400)throw new Error();}token=token.trim();
 source=databaseSource();await source.initialize();await new FacebookChannels(source,facebookConfig()).replaceToken(tenant,connection,token);console.log('Page credential verified and stored.');
}catch{console.error('Page credential update failed; check configuration, Page identity and operator context.');process.exitCode=1;}finally{if(source?.isInitialized)await source.destroy();}
