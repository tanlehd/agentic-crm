import { it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { ConnectorContactCache,checkedMapping } from '../src/contact-cache.js';
it('Connector cache isolate identity keys, expire without sliding, bound memory and return copies',()=>{
 for(const Cache of [ConnectorContactCache]){
  let now=0;const cache=new Cache(()=>now,10),m={tenant_id:randomUUID(),connection_id:randomUUID(),external_subject_id:'synthetic',crm_contact_id:randomUUID(),crm_identity_id:randomUUID(),mapping_revision:'1' as const};
  const key=cache.key(m.tenant_id,m.connection_id,m.external_subject_id);cache.put(key,m);now=9;expect(cache.get(key)).toEqual(m);const returned=cache.get(key)!;returned.crm_contact_id='changed';expect(cache.get(key)).toEqual(m);now=10;expect(cache.get(key)).toBeNull();
  cache.put(key,m);expect(cache.get(cache.key(randomUUID(),m.connection_id,m.external_subject_id))).toBeNull();for(let i=0;i<1000;i++)cache.put(String(i),m);expect(cache.get(key)).toBeNull();cache.clear();expect(cache.get('999')).toBeNull();
 }
});
it('remote mapping must bind tenant, connection, subject and valid CRM IDs',()=>{const t=randomUUID(),c=randomUUID(),m={tenant_id:t,connection_id:c,external_subject_id:'synthetic',crm_contact_id:randomUUID(),crm_identity_id:randomUUID(),mapping_revision:'1'};expect(checkedMapping(m,t,c,'synthetic')).toEqual(m);for(const changed of [{...m,tenant_id:randomUUID()},{...m,crm_contact_id:null},{...m,mapping_revision:'2'},null])expect(()=>checkedMapping(changed,t,c,'synthetic')).toThrow('INVALID_CONTACT_MAPPING');});
