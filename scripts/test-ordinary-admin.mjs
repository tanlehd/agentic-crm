// Test-only negative ACL probe. Tenant-admin bypass is intentional in production;
// exercise ordinary role/field policy by changing only the retained synthetic seat.
export async function ordinaryTestAdmin(ds,tenant,principal,run){
 if(process.env.APP_ENV!=='test'||ds.options.database!=='native_seed_test'||ds.options.host!=='127.0.0.1')throw Error('TEST_TARGET_DENIED');
 const [m]=await ds.query('SELECT m.id,m.seat_code FROM membership m JOIN principal p ON p.tenant_id=m.tenant_id AND p.membership_id=m.id WHERE p.tenant_id=? AND p.id=?',[tenant,principal]);if(!m)throw Error('TEST_MEMBER_REQUIRED');
 try{await ds.query("UPDATE membership SET seat_code='chat' WHERE tenant_id=? AND id=?",[tenant,m.id]);return await run();}
 finally{await ds.query('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[m.seat_code,tenant,m.id]);}
}
