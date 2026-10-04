export const seedUserNames=['alpha_admin','beta_admin','chat_anna','sales_binh','sales_chi','read_only'];
export async function provisionSeedUsers(api,passwords){
  // Managed user-profile attribute: only realm admins may view/edit the fixture marker.
  // Keycloak discards undeclared attributes with the default profile policy.
  const profile=await api('users/profile');
  const marker=profile.attributes.find(a=>a.name==='crm_fixture');
  if(marker){
    if(JSON.stringify(marker.permissions?.view)!==JSON.stringify(['admin'])||JSON.stringify(marker.permissions?.edit)!==JSON.stringify(['admin']))throw new Error('Fixture marker profile conflict');
  }else{
    await api('users/profile','PUT',{...profile,attributes:[...profile.attributes,{name:'crm_fixture',displayName:'Local CRM fixture',permissions:{view:['admin'],edit:['admin']}}]});
  }
  const subjects={};
  for(const username of seedUserNames){
    let matches=await api(`users?username=${username}&exact=true`);
    if(!matches.length){
      if(!passwords[username])throw new Error('Fixture password missing');
      // Password and identity are created together; rerun never rotates an existing credential.
      await api('users','POST',{username,enabled:true,firstName:username,lastName:'Fixture',email:`${username}@example.invalid`,emailVerified:true,requiredActions:[],attributes:{crm_fixture:['identity_v1']},credentials:[{type:'password',temporary:false,value:passwords[username]}]});
      matches=await api(`users?username=${username}&exact=true`);
    }
    if(matches.length!==1)throw new Error('Fixture username collision');
    const user=await api(`users/${encodeURIComponent(matches[0].id)}`);
    if(user.attributes?.crm_fixture?.[0]!=='identity_v1')throw new Error('Fixture username collision');
    subjects[username]=user.id;
  }
  return subjects;
}
