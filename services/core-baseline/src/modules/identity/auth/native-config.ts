import { SessionCrypto } from './security.js';
export function nativeConfig(env=process.env) {
  const origin=env.APP_ORIGIN??'http://localhost:8080';const url=new URL(origin);
  const local=['development','test'].includes(env.APP_ENV??'')&&['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if(url.origin!==origin||url.username||url.password||(!local&&url.protocol!=='https:')||!['http:','https:'].includes(url.protocol))throw new Error('AUTH_ORIGIN_INVALID');
  const encryptionKey=env.SESSION_ENCRYPTION_KEY??'';new SessionCrypto(encryptionKey);
  return {origin,secure:url.protocol==='https:',encryptionKey};
}
