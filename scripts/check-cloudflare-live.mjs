import fs from 'node:fs';import {randomBytes} from 'node:crypto';import assert from 'node:assert/strict';
const base='https://obra-clara-api.obra-clara.workers.dev';const token=randomBytes(32).toString('hex');const results=[];const buyer='https://obra-clara-comprador.vercel.app',seller='https://obra-clara-proveedor.vercel.app';
const dir=new URL('../cloudflare/private/',import.meta.url);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(new URL('qa-session.json',dir),JSON.stringify({token,base}),{mode:0o600});
async function req(command,{origin=buyer,session=token,fresh=false,path='/api/demo',method=command?'POST':'GET'}={}){const response=await fetch(base+path,{method,headers:{Origin:origin,Authorization:'Bearer '+session,...(fresh?{'X-OC-New-Workspace':'1'}:{}),...(command?{'Content-Type':'application/json'}:{})},body:command?JSON.stringify(command):undefined});let data;try{data=await response.json();}catch{data={error:'Non-JSON response'}}return {response,data};}
async function check(name,fn){try{await fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});throw e;}}
try{
 await check('D1 health',async()=>assert.equal((await req(null,{path:'/health'})).response.status,200));
 await check('Missing session rejected',async()=>assert.equal((await req(null,{session:'invalid'})).response.status,401));
 await check('Untrusted origin rejected',async()=>assert.equal((await req(null,{origin:'https://invalid.example'})).response.status,403));
 await check('Existing workspace not silently replaced',async()=>assert.equal((await req()).data.code,'MIGRATION_REQUIRED'));
 let state;
 await check('Isolated QA workspace creation',async()=>{const r=await req(null,{fresh:true});assert.equal(r.response.status,200,JSON.stringify(r.data));state=r.data;});
 for(const type of ['prices.initialize','demo.seedPurchases','project.budgets.initialize'])await check(type,async()=>{const r=await req({id:'qa-'+type,type,payload:{}});assert.equal(r.response.status,200,JSON.stringify(r.data));state=r.data;});
 const command={id:'qa-shared-project',type:'project',payload:{...state.projects[0],id:'cloudflare-qa',name:'QA Cloudflare sync'}};
 await check('Buyer write',async()=>{const r=await req(command);assert.equal(r.response.status,200,JSON.stringify(r.data));state=r.data;});
 const revision=state.revision;
 await check('Seller sees buyer write and CORS',async()=>{const r=await req(null,{origin:seller});assert.equal(r.response.status,200);assert.equal(r.response.headers.get('access-control-allow-origin'),seller);assert.equal(r.data.projects.find(p=>p.id==='cloudflare-qa').name,'QA Cloudflare sync');});
 await check('Duplicate command idempotency',async()=>assert.equal((await req(command)).data.revision,revision));
 await check('Parallel updates preserved',async()=>{const writes=await Promise.all(Array.from({length:3},(_,i)=>req({id:'qa-parallel-'+i,type:'project',payload:{...command.payload,id:'cloudflare-qa-'+i}},{origin:i%2?seller:buyer})));for(const r of writes)assert.equal(r.response.status,200,JSON.stringify(r.data));const r=await req();for(let i=0;i<3;i++)assert(r.data.projects.some(p=>p.id==='cloudflare-qa-'+i));assert.equal(r.data.revision,revision+3);});
 await check('Workspace isolation',async()=>assert.equal((await req(null,{session:randomBytes(32).toString('hex')})).data.code,'MIGRATION_REQUIRED'));
 console.log(JSON.stringify({base,passed:true,checks:results},null,2));
}catch(e){console.log(JSON.stringify({base,passed:false,checks:results,error:e.message,cause:e.cause?.message},null,2));process.exitCode=1;}
