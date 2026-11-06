import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {load} from './project-scope-loader.mjs';
if(!process.argv.includes('--apply'))throw Error('Explicit --apply is required.');
const config=JSON.parse(fs.readFileSync('cloudflare/wrangler.jsonc'));assert.equal(config.name,'obra-clara-api');const db=config.d1_databases.find(d=>d.database_name==='obra-clara-shared');assert.ok(db);
const token=fs.readFileSync(path.join(os.homedir(),'Library/Preferences/.wrangler/config/default.toml'),'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];if(!token)throw Error('Authenticate with Wrangler first.');
const endpoint=`https://api.cloudflare.com/client/v4/accounts/${config.account_id}/d1/database/${db.database_id}/query`;
async function query(sql,params=[]){const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({sql,params})});const data=await response.json();if(!response.ok||!data.success)throw Error('Database operation rejected: HTTP '+response.status);return data.result[0];}
const m=load('lib/demo-model.ts'),pricing=load('lib/pricing-model.ts'),weather=load('lib/weather-model.ts'),service=load('lib/weather-service.ts'),rain=load('lib/rain-alert-model.ts');
const forecast=await service.getWeatherForecast('Caballito','CABA');const now=new Date();
const rows=(await query('SELECT id,revision,state FROM workspaces')).results;
fs.writeFileSync('cloudflare/private/rain-proof-before-'+now.toISOString().replace(/[:.]/g,'-')+'.json',JSON.stringify(rows),{mode:0o600});
const commandId='rain-proof-purchase-v1';let created=0,alreadyPresent=0;
for(const source of rows){let row=source;for(let attempt=0;attempt<4;attempt++){
 const before=JSON.parse(row.state);if(before.orders.some(o=>o.requestId===commandId)){alreadyPresent++;break;}
 const project=before.projects.find(p=>p.id==='sample-project-caballito');assert.ok(project);
 const offer=m.catalog(before).find(p=>p.category==='Corralón'&&p.shippingIncluded&&!pricing.directPriceIssue(p,now.getTime())&&p.stock-m.reserved(before,p.id)>=Math.max(10,p.minimumOrder??1));if(!offer)throw Error('No suitable in-stock offer for the test purchase.');
 let state=m.applyCommand(before,{id:commandId,type:'order.create',payload:{products:[{id:offer.id,projectId:project.id,quantity:Math.max(10,offer.minimumOrder??1),deliveryChoice:'supplier'}]}});
 const order=state.orders.find(o=>o.requestId===commandId);state=m.applyCommand(state,{id:commandId+'-accept',type:'order.status',payload:{orderId:order.id,status:'Aceptada'}});
 const step=30*60000;const first=Math.ceil((now.getTime()+15*60000)/step)*step;let chosen;
 for(let start=first;start<now.getTime()+4*86400000;start+=step){const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(start));const date=stamp.slice(0,10),time=stamp.slice(11,16);const candidate={...state,procurement:{...state.procurement,deliveries:{...state.procurement?.deliveries,[order.id]:{date,time}}}};const report=rain.buildRainReport(candidate,{[weather.weatherKey(weather.projectWeatherLocation(project))]:forecast},now);if(report.alerts.some(a=>a.orders.some(o=>o.id===order.id))){chosen={date,time};break;}}
 if(!chosen)throw Error('No upcoming rainy delivery window. No test purchase has been saved.');
 state=m.applyCommand(state,{id:commandId+'-schedule',type:'procurement.schedule',payload:{orderId:order.id,...chosen,receiver:project.contactName,carrier:'Logística del proveedor',reason:'Compra ficticia para probar el cruce automático con la API meteorológica. Recepción extraordinaria de prueba, ventana de descarga de dos horas.'}});
 const result=await query('UPDATE workspaces SET state=?, revision=?, updated_at=? WHERE id=? AND revision=?',[JSON.stringify(state),state.revision,new Date().toISOString(),row.id,row.revision]);
 if(result.meta.changes===1){created++;console.log(JSON.stringify({order:order.id,project:project.name,...chosen,source:'Real Open-Meteo hourly forecast',purchase:'Fictional persisted test order'}));break;}
 row=(await query('SELECT id,revision,state FROM workspaces WHERE id=?',[row.id])).results[0];if(attempt===3)throw Error('Concurrent update prevented seeding.');
 }}
console.log(JSON.stringify({created,alreadyPresent,projectCountUnchanged:true}));
