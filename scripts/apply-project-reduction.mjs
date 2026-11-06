import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {load} from './project-scope-loader.mjs';
if(!process.argv.includes('--apply'))throw Error('Explicit --apply is required.');
const config=JSON.parse(fs.readFileSync('cloudflare/wrangler.jsonc','utf8'));
assert.equal(config.name,'obra-clara-api');const db=config.d1_databases.find(d=>d.database_name==='obra-clara-shared');assert.ok(db);
const credentials=fs.readFileSync(path.join(os.homedir(),'Library/Preferences/.wrangler/config/default.toml'),'utf8');const token=credentials.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];if(!token)throw Error('Authenticate with Wrangler first.');
const endpoint=`https://api.cloudflare.com/client/v4/accounts/${config.account_id}/d1/database/${db.database_id}/query`;
async function query(sql,params=[]){const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({sql,params})});const data=await response.json();if(!response.ok||!data.success)throw Error('Cloudflare rejected the database operation: HTTP '+response.status);return data.result[0];}
const {reduceDemoProjects}=load('lib/project-scope-migration.ts');const keep=new Set(load('components/demo-project-scope.ts').demoProjectIds);
const rows=(await query('SELECT id, revision, state FROM workspaces')).results;
const backup='cloudflare/private/projects-latest-before-reduction-2026-11-06.json';assert.ok(!fs.existsSync(backup),'Do not overwrite the backup.');fs.writeFileSync(backup,JSON.stringify(rows),{mode:0o600});
let updated=0,removedOrders=0;
for(const source of rows){let row=source;for(let attempt=0;attempt<4;attempt++){
 const before=JSON.parse(row.state),after=reduceDemoProjects(before);if(after===before)break;
 assert.equal(after.projects.length,5);assert.ok(after.projects.every(p=>keep.has(p.id)));assert.ok(after.orders.every(o=>keep.has(o.project.id)));assert.ok((after.finance?.contracts??[]).every(c=>keep.has(c.projectId)));
 if(after.finance){assert.equal(after.finance.wallet,before.finance.wallet);assert.equal(after.finance.movements.reduce((n,m)=>n+m.walletDelta,0),after.finance.wallet);}
 const result=await query('UPDATE workspaces SET state=?, revision=?, updated_at=? WHERE id=? AND revision=?',[JSON.stringify(after),after.revision,new Date().toISOString(),row.id,row.revision]);
 if(result.meta.changes===1){updated++;removedOrders+=before.orders.filter(o=>!keep.has(o.project.id)).length;break;}
 row=(await query('SELECT id, revision, state FROM workspaces WHERE id=?',[row.id])).results[0];assert.ok(row);if(attempt===3)throw Error('Concurrent changes prevented cleanup. Retry after inspecting the workspace.');
 }}
const verification=(await query('SELECT state FROM workspaces')).results.map(row=>JSON.parse(row.state));
assert.ok(verification.every(s=>s.projectScopeVersion===1&&s.projects.length===5&&s.projects.every(p=>keep.has(p.id))));assert.ok(verification.every(s=>s.orders.every(o=>keep.has(o.project.id))&&(s.finance?.contracts??[]).every(c=>keep.has(c.projectId))));
console.log(JSON.stringify({verifiedWorkspaces:verification.length,updated,removedOrders,projectsPerWorkspace:5}));
