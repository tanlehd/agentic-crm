import { seedRegistry } from '../src/modules/crm/seed.js';
import { describe,it,expect } from 'vitest';
import type { DataSource } from 'typeorm';
import { migrate } from '../src/kernel/database/migration-runner.js';
import { fixtureId,seedIdentity,seedUsers, type SeedInput } from '../src/modules/identity/seed.js';
import { IdentityAuthorization } from '../src/modules/identity/authorization.js';
import { UnitOfWork } from '../src/kernel/tenancy/unit-of-work.js';
import { permits } from '../src/modules/identity/domain/authorization.js';
const env={APP_ENV:'test',APP_ORIGIN:'http://localhost:8080',MYSQL_HOST:'mysql',MYSQL_DATABASE:'seed_test'};
const input:SeedInput={issuer:'http://localhost:8080/identity/realms/agentic-crm-dev',subjects:Object.fromEntries(seedUsers.map(u=>[u,`synthetic-${u}`])) as SeedInput['subjects']};
export function seedCases(isolated:(name:string)=>Promise<DataSource>){
  describe('SRC-009 Identity bootstrap',()=>{
    let ds:DataSource;
    it('rejects unsafe targets and invalid mappings before writes',async()=>{
      ds=await isolated('seed_test');await migrate(ds);
      for(const change of [{APP_ENV:'production'},{APP_ORIGIN:'https://example.com'},{MYSQL_HOST:'remote'},{MYSQL_DATABASE:'production'}])await expect(seedIdentity(ds,input,{...env,...change})).rejects.toThrow();
      await expect(seedIdentity(ds,{...input,issuer:'http://other.invalid'},env)).rejects.toThrow('SEED_INVALID_MAPPING');
      await expect(seedIdentity(ds,{...input,subjects:{...input.subjects,beta_admin:input.subjects.alpha_admin}},env)).rejects.toThrow('SEED_INVALID_MAPPING');
      expect(await ds.query('SELECT id FROM tenant')).toEqual([]);
    });
    it('rolls back both tenants/accounts/audit/outbox on a late write failure',async()=>{
      await ds.query(`CREATE TRIGGER seed_fail BEFORE INSERT ON service_actor FOR EACH ROW BEGIN IF NEW.tenant_id='${fixtureId("clinic_beta")}' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END`);
      await expect(seedIdentity(ds,input,env)).rejects.toThrow();
      for(const table of ['tenant','account','membership','role','audit_entry','outbox_event'])expect(await ds.query(`SELECT id FROM \`${table}\``)).toEqual([]);
      await ds.query('DROP TRIGGER seed_fail');
    });
    it('serializes concurrent seeds; preserves existing OIDC account and exact repeat snapshot',async()=>{
      const account='00900000-0000-5000-a000-000000000099';
      await ds.query("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,?,?,'Previously logged in',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[account,input.issuer,input.subjects.alpha_admin]);
      const results=await Promise.all([seedIdentity(ds,input,env),seedIdentity(ds,input,env)]);
      expect(results.map(r=>r.created).sort()).toEqual([0,2]);
      const snapshot=async()=>Promise.all(['tenant','account','membership','principal','role','team','service_actor','agent_policy','ai_agent','principal_role','team_member','audit_entry','outbox_event'].map(table=>ds.query(`SELECT * FROM \`${table}\` ORDER BY 1,2`)));
      const before=await snapshot();expect(await seedIdentity(ds,input,env)).toEqual({created:0,existing:2});expect(await snapshot()).toEqual(before);
      const [member]=await ds.query('SELECT account_id FROM membership WHERE id=?',[fixtureId('alpha:member:alpha_admin')]);expect(member.account_id).toBe(account);
      expect((await ds.query('SELECT id FROM audit_entry')).length).toBe(2);
      expect((await ds.query('SELECT id FROM outbox_event')).length).toBe(9);
      expect(fixtureId('alpha:human:sales_binh')<fixtureId('alpha:human:sales_chi')).toBe(true);
      const auth=new IdentityAuthorization(new UnitOfWork(ds));
      await auth.runHuman(account,fixtureId('clinic_alpha'),async(_s,access)=>expect(permits(access,'membership','create')).toBe(true));
      await expect(auth.runHuman(account,fixtureId('clinic_beta'),async()=>{})).rejects.toThrow('FORBIDDEN');
      for(const label of ['alpha','beta'])await auth.runHuman(fixtureId('account:read_only'),fixtureId(`clinic_${label}`),async(_s,access)=>expect(permits(access,'membership','create')).toBe(false));
      const actors=await ds.query('SELECT id FROM service_actor');for(const actor of actors)expect(await ds.query('SELECT id FROM principal WHERE id=?',[actor.id])).toEqual([]);
    });
    it('registry v2 is atomic, concurrent/repeat safe and preserves edited metadata/ACL',async()=>{
      await ds.query(`CREATE TRIGGER registry_seed_fail BEFORE INSERT ON object_type FOR EACH ROW BEGIN IF NEW.tenant_id='${fixtureId("clinic_beta")}' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END`);
      await expect(seedRegistry(ds,env)).rejects.toThrow();expect(await ds.query('SELECT id FROM object_type')).toEqual([]);
      expect(await ds.query("SELECT id FROM audit_entry WHERE action='registry.bootstrap.v2'")).toEqual([]);
      await ds.query('DROP TRIGGER registry_seed_fail');
      const results=await Promise.all([seedRegistry(ds,env),seedRegistry(ds,env)]);expect(results.map(r=>r.created).sort()).toEqual([0,2]);
      expect((await ds.query('SELECT COUNT(*) n FROM object_type'))[0].n).toBe('14');
      await ds.query("UPDATE object_type SET label='Preserved',version=version+1 WHERE id=?",[fixtureId('alpha:object:contact')]);
      const snapshot=await ds.query('SELECT * FROM object_type ORDER BY id');const roles=await ds.query('SELECT * FROM `role` ORDER BY id');
      expect(await seedRegistry(ds,env)).toEqual({created:0,existing:2});expect(await ds.query('SELECT * FROM object_type ORDER BY id')).toEqual(snapshot);expect(await ds.query('SELECT * FROM `role` ORDER BY id')).toEqual(roles);
      await ds.query('DELETE FROM object_type WHERE id=?',[fixtureId('beta:object:ticket')]);await expect(seedRegistry(ds,env)).rejects.toThrow('SEED_INCOMPLETE');
    });
    it('rerun preserves revocation and refuses changed provider mapping or incomplete fixture',async()=>{
      await ds.query("UPDATE membership SET status='suspended',auth_revision=auth_revision+1 WHERE id=?",[fixtureId('alpha:member:chat_anna')]);
      await ds.query('DELETE FROM principal_role WHERE principal_id=?',[fixtureId('alpha:human:chat_anna')]);
      await seedIdentity(ds,input,env);
      expect((await ds.query('SELECT status FROM membership WHERE id=?',[fixtureId('alpha:member:chat_anna')]))[0].status).toBe('suspended');
      expect(await ds.query('SELECT * FROM principal_role WHERE principal_id=?',[fixtureId('alpha:human:chat_anna')])).toEqual([]);
      await expect(seedIdentity(ds,{...input,subjects:{...input.subjects,beta_admin:'new-provider-subject'}},env)).rejects.toThrow();
      await ds.query('DELETE FROM service_actor WHERE tenant_id=?',[fixtureId('clinic_beta')]);
      await expect(seedIdentity(ds,input,env)).rejects.toThrow('SEED_INCOMPLETE');
    });
  });
}
