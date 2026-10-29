import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

export async function workloadCertificates(){
  const privateDir=resolve('.local/workload-tls'),runDir=resolve(privateDir,randomUUID());
  await mkdir(runDir,{recursive:true});
  const openssl=process.env.OPENSSL_PATH??(process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl');
  function run(args){const r=spawnSync(openssl,args,{stdio:['ignore','pipe','pipe'],windowsHide:true,timeout:30000});assert.equal(r.status,0,'Synthetic certificate generation failed');}
  async function root(name){
    const key=resolve(privateDir,name+'.key'),cert=resolve(privateDir,name+'.crt');
    try{await access(cert);await access(key);}catch(error){
      if(error.code!=='ENOENT')throw error;
      run(['req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-days','3650','-subj','/CN=Agentic CRM synthetic test CA '+name,'-addext','basicConstraints=critical,CA:TRUE','-addext','keyUsage=critical,keyCertSign,cRLSign','-keyout',key,'-out',cert]);
    }
    return {key,cert};
  }
  const ca=await root('root'),otherCa=await root('other-root');
  async function material(name,service,rootCa=ca,days=1,extraSan=''){
    const key=resolve(runDir,name+'.key'),csr=resolve(runDir,name+'.csr'),cert=resolve(runDir,name+'.crt'),ext=resolve(runDir,name+'.ext');
    await writeFile(ext,`basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=serverAuth,clientAuth\nsubjectAltName=URI:spiffe://agentic-crm/service/${service}${extraSan}\n`,{mode:0o600});
    run(['req','-new','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-subj','/CN=Synthetic '+name,'-keyout',key,'-out',csr]);
    run(['x509','-req','-in',csr,'-CA',rootCa.cert,'-CAkey',rootCa.key,'-set_serial','0x'+randomBytes(16).toString('hex'),'-days',String(days),'-sha256','-extfile',ext,'-out',cert]);
    return {key:await readFile(key),cert:await readFile(cert),ca:await readFile(ca.cert),service};
  }
  return {material,ca,otherCa,privateDir,runDir};
}
