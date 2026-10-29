import {createHash,timingSafeEqual} from 'node:crypto';
import type {IncomingHttpHeaders} from 'node:http';
import {TransportError,workloadServices,type Peer,type ServiceName,type TlsMaterial} from './workload-tls.js';

export type LocalHttpKeys=Partial<Record<ServiceName,string>>;
export function localHttpKeys(value:unknown):LocalHttpKeys {
 if(!value||typeof value!=='object'||Array.isArray(value)||!Object.keys(value).length)throw new TransportError('INVALID_REQUEST');
 for(const [service,key] of Object.entries(value))if(!(workloadServices as readonly string[]).includes(service)||typeof key!=='string'||!/^[a-f0-9]{64}$/.test(key))throw new TransportError('INVALID_REQUEST');
 return Object.freeze({...value}) as LocalHttpKeys;
}
export function localHttpPeer(material:TlsMaterial,service:ServiceName=material.service):Peer {
 const key=material.localHttp?.[service];if(!key)throw new TransportError('UNAUTHENTICATED');
 return {service,fingerprint:createHash('sha256').update(key).digest('hex')};
}
export function localHttpHeaders(material:TlsMaterial){
 localHttpPeer(material);
 return {'x-workload-service':material.service,'x-workload-key':material.localHttp![material.service]!};
}
export function authenticateLocalHttp(material:TlsMaterial,headers:IncomingHttpHeaders,expected?:ServiceName):Peer {
 const service=headers['x-workload-service'],key=headers['x-workload-key'];
 if(typeof service!=='string'||typeof key!=='string'||expected&&service!==expected)throw new TransportError('UNAUTHENTICATED');
 const known=material.localHttp?.[service as ServiceName];
 if(!known||Buffer.byteLength(key)!==Buffer.byteLength(known)||!timingSafeEqual(Buffer.from(key),Buffer.from(known)))throw new TransportError('UNAUTHENTICATED');
 return localHttpPeer(material,service as ServiceName);
}
