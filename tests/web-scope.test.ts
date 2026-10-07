import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
test('HTTP: Web and MCP reject missing scopes; correctly scoped Web preserves subject',{timeout:20000},async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);Object.assign(jwk,{kid:'test',alg:'RS256'});
 const jwks=createServer((_q,r)=>{r.setHeader('content-type','application/json');r.end(JSON.stringify({keys:[jwk]}));});await new Promise<void>(r=>jwks.listen(0,'127.0.0.1',r));const a=jwks.address();assert.ok(a&&typeof a!=='string');
 const reservation=createServer();await new Promise<void>(r=>reservation.listen(0,'127.0.0.1',r));const b=reservation.address();assert.ok(b&&typeof b!=='string');const port=b.port;await new Promise<void>(r=>reservation.close(()=>r()));
 const dir=await mkdtemp(join(tmpdir(),'glow-scope-'));const mod=join(dir,'runtime.mjs');await writeFile(mod,`export async function createGlowCombinedRuntime(){return {execute:async(subject,raw)=>({request_id:raw.request_id,status:'completed',exposure:'PUBLIC_DECLASSIFIED',result:{mission_id:'TEST',state:subject}})}}`);
 const p=spawn(process.execPath,[resolve('dist/src/server.js')],{env:{...process.env,PORT:String(port),GLOW_ALLOWED_HOSTS:'localhost,127.0.0.1',GLOW_COMBINED_RUNTIME_MODULE:mod,GLOW_AUTH_MODE:'oauth',GLOW_OAUTH_ISSUER:'https://synthetic.invalid',GLOW_OAUTH_AUDIENCE:'authenticated',GLOW_OAUTH_JWKS_URL:`http://127.0.0.1:${a.port}/jwks`,GLOW_PUBLIC_MCP_URL:`http://127.0.0.1:${port}/mcp-v2`,GLOW_OAUTH_REQUIRED_SCOPES:'email profile',GLOW_STAGING_UI_ENABLED:'0'},stdio:'ignore'});const exited=new Promise<void>(r=>p.once('exit',()=>r()));
 try{
 let ready=false;for(let i=0;i<100;i++){try{await fetch(`http://127.0.0.1:${port}/healthz`);ready=true;break;}catch{}await new Promise(r=>setTimeout(r,30));}assert.equal(ready,true);
 const token=async(scope:string)=>new SignJWT({scope}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer('https://synthetic.invalid').setAudience('authenticated').setSubject('synthetic-subject').setExpirationTime('5m').sign(privateKey);
 for(const scope of ['', 'email','email unrelated']){
 const auth=await token(scope);
 for(const route of ['start','status','delivery']){
 const res=await fetch(`http://127.0.0.1:${port}/api/web/${route}`,{method:'POST',headers:{authorization:`Bearer ${auth}`,'content-type':'application/json'},body:JSON.stringify({role:'teacher',input:{},mission_id:'M'})});assert.equal(res.status,403,route+' '+scope);}
 const res=await fetch(`http://127.0.0.1:${port}/mcp-v2`,{method:'POST',headers:{authorization:`Bearer ${auth}`,'content-type':'application/json'},body:'{}'});assert.equal(res.status,403);
 }
 const res=await fetch(`http://127.0.0.1:${port}/api/web/start`,{method:'POST',headers:{authorization:`Bearer ${await token('email profile')}`,'content-type':'application/json'},body:JSON.stringify({role:'teacher',input:{}})});assert.equal(res.status,200);assert.equal((await res.json()).result.state,'synthetic-subject');
 }finally{p.kill();await exited;await new Promise<void>(r=>jwks.close(()=>r()));await rm(dir,{recursive:true,force:true});}
});
