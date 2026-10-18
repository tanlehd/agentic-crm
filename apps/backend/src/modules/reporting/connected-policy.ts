import {stageSource} from './stage-source.js';
import type {DataSource} from 'typeorm';
import {operationsSource} from '../agents/operations-source.js';
import {conversionSource} from './conversion-source.js';
import {CommandError} from '../../kernel/reliability/commands.js';
export async function connectedPolicy(ds:DataSource,account:string,tenant:string,csv=false){
 const stage=await stageSource(ds,account,tenant,csv);
 const operations=await operationsSource(ds,account,tenant,csv),conversion=await conversionSource(ds,account,tenant,csv);
 if(operations.authRevision!==conversion.authRevision||operations.authRevision!==stage.authRevision)throw new CommandError(403,'AUTHORITY_CHANGED');
 return {authRevision:operations.authRevision,policy:{...operations.policy,conversion:conversion.conversion,stage:stage.stage}};
}
