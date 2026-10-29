import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { localContext, preflight, evidence, schemaSnapshot, connectionStatus, start, pending, until, registerMonitor, observe } from './lib/connector-local.mjs';

const mode = process.argv[2];
assert.ok(['--check','--apply','--rollback','--status'].includes(mode) && process.argv.length===3, 'Choose --check, --apply, --rollback or --status');
try {
  const ctx = await localContext({ initialize: mode==='--apply' });
  if(mode==='--status') {
    const status=await observe(ctx);await evidence('status',status);
    console.log(JSON.stringify(status.health));
    console.log('Current registry snapshot saved; legacy monitor3020 remains unchanged.');
  } else if (mode==='--rollback') {
    // Stop ingress first; drain durable v2 work before disabling this binding.
    await ctx.dc(['stop','connector-api']);
    await until(async()=>await pending(ctx)===0,'DRAIN_REQUIRED: retained queue must finish before rollback');
    await connectionStatus(ctx,'disabled');
    await ctx.dc(['stop','connector-worker']);
    for(const id of ['connector-api','connector-worker']) await writeFile(`.local/services/${id}.env`,await readFile(`.local/services/${id}.env.before-src107`),{mode:0o600});
    await evidence('rollback',{passed:true,queueDrained:true,bindingDisabled:true,retained:true,image:ctx.config.CONNECTOR_IMAGE});
    console.log('PASS rollback: ingress stopped, queue drained, binding disabled; data/image retained');
  } else {
    const facts=await preflight(ctx);
    if(mode==='--apply') {
      await ctx.dc(['up','-d','--no-build','--wait','--wait-timeout','120','connector-mysql']);
      // Explicit operator action; API/worker startup never performs migrations.
      await ctx.dc(['run','--rm','--no-deps','connector-admin','node','dist/main.js','migrate']);
      assert.deepEqual((await schemaSnapshot(ctx)).map(({state,...m})=>{assert.equal(state,'applied');return m;}),facts.manifest);
      await ctx.dc(['run','--rm','--no-deps','connector-admin','node','dist/main.js','grant']);
      const existing=await ctx.ownSql(`SELECT status FROM connector_connection WHERE id='${ctx.config.CONNECTOR_CONNECTION_ID}';`);
      if(existing==='disabled') await connectionStatus(ctx,'active');
      await ctx.dc(['run','--rm','--no-deps','connector-admin','node','dist/main.js','provision']);
      await registerMonitor(ctx); await start(ctx);
    }
    await evidence(mode.slice(2),{passed:true,...facts,project:'agentic-crm-connector-local',schema:5});
    console.log('PASS '+mode.slice(2)+': pinned Connector schema5 candidate; actual native binding/lookup and backend worker ready');
  }
} catch(error) {
  await evidence(mode.slice(2)+'-failure',{passed:false,error:'CONNECTOR_ROLLOUT_FAILED',retained:true});
  console.error('CONNECTOR_ROLLOUT_FAILED: inspect sanitized preflight and service health; private data retained');process.exitCode=1;
}
