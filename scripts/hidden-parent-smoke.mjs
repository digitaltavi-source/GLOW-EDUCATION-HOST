import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const root=process.cwd();
const smokeBase=resolve(root,`.host-smoke-${process.pid}`);
const smokeRoot=resolve(smokeBase,'public-host');
mkdirSync(smokeRoot,{recursive:true});
cpSync(resolve(root,'dist'),resolve(smokeRoot,'dist'),{recursive:true});
cpSync(resolve(root,'package.json'),resolve(smokeRoot,'package.json'));
cpSync(resolve(root,'node_modules'),resolve(smokeRoot,'node_modules'),{recursive:true});

const env={...process.env,
  PORT:'3191',
  GLOW_ALLOWED_HOSTS:'127.0.0.1,localhost',
  GLOW_PROTECTED_SERVICE_URL:'https://protected.example',
  GLOW_PROTECTED_SERVICE_TOKEN:'ci-placeholder-token-not-a-secret',
  GLOW_AUTH_MODE:'staging_disabled'
};
const child=spawn(process.execPath,['dist/src/server.js'],{cwd:smokeRoot,env,stdio:['ignore','pipe','pipe']});
let logs='';
child.stdout.on('data',d=>{logs+=String(d)});
child.stderr.on('data',d=>{logs+=String(d)});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function text(path){
  const r=await fetch('http://127.0.0.1:3191'+path);
  if(!r.ok) throw new Error(`HTTP_${r.status}:${path}`);
  return r.text();
}
try{
  let health=null;
  for(let i=0;i<30;i++){
    if(child.exitCode!==null) break;
    try{ health=JSON.parse(await text('/healthz')); break; }catch{ await sleep(200); }
  }
  if(!health?.ok) throw new Error('HIDDEN_PARENT_HEALTH_FAILED');
  const rootHtml=await text('/');
  const appHtml=await text('/app');
  if(rootHtml!==appHtml) throw new Error('HIDDEN_PARENT_ROOT_APP_MISMATCH');
  if(!rootHtml.includes('Mission Control')) throw new Error('HIDDEN_PARENT_MISSION_CONTROL_MISSING');
  if(!rootHtml.includes('Tạo mission thật')) throw new Error('HIDDEN_PARENT_START_COPY_MISSING');
  if(!(await text('/oauth-client.js')).length) throw new Error('HIDDEN_PARENT_OAUTH_ASSET_MISSING');
  if(!(await text('/web-client.js')).length) throw new Error('HIDDEN_PARENT_WEB_ASSET_MISSING');
  if(logs.includes('CONFIG_OAUTH_ISSUER_REQUIRED')) throw new Error('HIDDEN_PARENT_OAUTH_BOOT_REGRESSION');
  console.log('HIDDEN_PARENT_SMOKE=PASS');
}catch(error){
  console.error('HIDDEN_PARENT_SMOKE=FAIL',error?.stack||error);
  console.error(logs.slice(-12000));
  process.exitCode=1;
}finally{
  if(child.exitCode===null){ child.kill('SIGTERM'); await Promise.race([new Promise(r=>child.once('exit',r)),sleep(2000)]); }
  try{ rmSync(smokeBase,{recursive:true,force:true,maxRetries:3,retryDelay:100}); }catch{}
}
