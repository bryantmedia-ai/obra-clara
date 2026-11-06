import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const source=fs.readFileSync(file,'utf8');vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,structuredClone,URL,Request,Response,TextEncoder,TextDecoder,Uint8Array,crypto:webcrypto,require:n=>{const target=path.normalize(path.join(path.dirname(file),n));return n.endsWith('.json')?JSON.parse(fs.readFileSync(target)):load(target+'.ts');}});return exports;}

const worker=load('cloudflare/worker.ts');
const database=new DatabaseSync(':memory:');database.exec(fs.readFileSync('cloudflare/schema.sql','utf8'));
let forcedConflict=false;
const env={DB:{prepare(sql){let values=[];const stmt={bind(...v){values=v;return stmt;},async first(){return database.prepare(sql).get(...values)??null;},async run(){if(forcedConflict&&sql.startsWith('UPDATE')){forcedConflict=false;return {meta:{changes:0}};}return {meta:{changes:Number(database.prepare(sql).run(...values).changes)}};}};return stmt;}}};
const token='a'.repeat(64), other='b'.repeat(64);
function request(command,{session=token,origin='https://obra-clara-comprador.vercel.app',fresh=false,path='/api/demo',method=command?'POST':'GET'}={}){return worker.handle(new Request('https://api.example'+path,{method,headers:{Origin:origin,Authorization:'Bearer '+session,...(fresh?{'X-OC-New-Workspace':'1'}:{}),...(command?{'Content-Type':'application/json'}:{})},body:command?JSON.stringify(command):undefined}),env);}
assert.equal((await request(null,{session:'bad'})).status,401);
assert.equal((await request(null,{origin:'https://evil.example'})).status,403);
assert.equal((await request(null,{method:'OPTIONS'})).status,204);
assert.equal((await request(null,{path:'/health'})).status,200);
assert.equal((await request()).status,409,'existing sessions cannot be silently replaced');
let res=await request(null,{fresh:true});assert.equal(res.status,200);assert.equal(res.headers.get('Access-Control-Allow-Origin'),'https://obra-clara-comprador.vercel.app');
const initial=await res.json();assert.equal(initial.revision,0);
const project={...initial.projects[0],id:'migration-qa',name:'Proyecto sincronizado'};
const command={id:'test-project',type:'project',payload:project};
res=await request(command);assert.equal(res.status,200);let state=await res.json();assert.equal(state.revision,1);
res=await request(command);assert.equal((await res.json()).revision,1,'duplicate commands are idempotent');
state=await (await request(null,{origin:'https://obra-clara-proveedor.vercel.app'})).json();assert.equal(state.projects.find(p=>p.id===project.id).name,project.name);
assert.equal((await request(null,{session:other})).status,409,'workspaces stay isolated');
forcedConflict=true;res=await request({id:'retry-project',type:'project',payload:{...project,name:'After conflict'}});assert.equal(res.status,200);assert.equal((await res.json()).revision,2);
await Promise.all(Array.from({length:4},(_,i)=>request({id:'parallel-'+i,type:'project',payload:{...project,id:'parallel-'+i}})));
state=await (await request()).json();assert.equal(state.revision,6);for(let i=0;i<4;i++)assert(state.projects.some(p=>p.id==='parallel-'+i));
assert.equal((await request({id:'bad-project',type:'project',payload:{}})).status,400);
assert.equal((await request({id:'oversize',type:'project',payload:'x'.repeat(1500001)})).status,400);
assert.equal((await request(null,{method:'DELETE'})).status,405);
assert.equal((await request(null,{path:'/unknown'})).status,404);
const unavailable={DB:{prepare(){throw new Error('unavailable')}}};
assert.equal((await worker.handle(new Request('https://api.example/api/demo',{headers:{Authorization:'Bearer '+token}}),unavailable)).status,503);
console.log('PASS: D1 persistence, both app origins, workspace isolation, no silent legacy reset, idempotency, optimistic concurrency/retries, parallel writes, input limits and storage errors.');

const legacyToken='c'.repeat(64);const legacyId=Array.from(new Uint8Array(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(legacyToken))),b=>b.toString(16).padStart(2,'0')).join('');
const legacyState={...initial,projectScopeVersion:undefined,projects:[...initial.projects,{...initial.projects[0],id:'olivos',name:'Casa Olivos'}]};database.prepare('INSERT INTO workspaces (id, revision, state, updated_at) VALUES (?, ?, ?, ?)').run(legacyId,0,JSON.stringify(legacyState),new Date().toISOString());
const migrated=await (await request(null,{session:legacyToken})).json();assert.equal(migrated.projects.length,5);assert.equal(migrated.projectScopeVersion,1);assert.equal(migrated.revision,1);assert.equal(JSON.parse(database.prepare('SELECT state FROM workspaces WHERE id=?').get(legacyId).state).projects.length,5);assert.equal((await (await request(null,{session:legacyToken})).json()).revision,1);console.log('PASS legacy workspace cleanup persists on GET and never repeats.');
