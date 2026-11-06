import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';import assert from 'node:assert/strict';
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,structuredClone,URL,require:n=>{const target=path.normalize(path.join(path.dirname(file),n));return n.endsWith('.json')?JSON.parse(fs.readFileSync(target)):load(target+'.ts');}});return exports;}
const m=load('lib/demo-model.ts'),v=load('lib/vendor-catalog-model.ts'),p=load('components/project-data.ts');let state=m.emptyState(),i=0;
const run=(type,payload,id='catalog-check-'+(++i))=>state=m.applyCommand(state,{id,type,payload});
run('project',{...p.emptyProject(),id:'catalog-project',name:'Torre catálogo',type:'Edificio',scope:'10 pisos',address:'Obra 100',city:'CABA',province:'CABA',postalCode:'1000',startDate:'2026-11-04',contactName:'Responsable',contactPhone:'1100000000',deliveryHours:'8 a 16',unloading:'Hidrogrúa',access:'Camión'});
assert.equal(v.vendorCatalogs.length,1197);const refs=v.vendorCatalogs.flatMap(c=>c.products);assert.ok(refs.length>=375);assert.equal(new Set(refs.map(r=>r.id)).size,refs.length);assert.ok(refs.every(r=>r.sourceUrl.startsWith('https://')));assert.ok(refs.every(r=>!('price' in r)&&!('stock' in r)));
const vendor=v.vendorCatalogs.find(c=>c.supplierName==='Electromecánica Brenta / Miron'),product=vendor.products[0];assert.ok(product.name.includes('Transformadores'));
const request={supplierId:vendor.supplierId,productId:product.id,projectId:'catalog-project',quantity:300,unit:'U',mode:'manufacture',specifications:'Fabricación con ensayos, plano y entregas por etapas.',requiredDate:new Date(Date.now()+40*86400000).toISOString().slice(0,10)};
const before=JSON.stringify(state.orders),offers=JSON.stringify(state.offers),wallet=m.snapshot(state).finance.wallet;
for(const bad of [{quantity:0},{quantity:1.5},{quantity:Infinity},{projectId:'unknown'},{supplierId:'unknown'},{productId:'unknown'},{specifications:''},{mode:'invalid'},{requiredDate:'2020-01-01'}]){const snapshot=JSON.stringify(state);assert.throws(()=>run('catalog.request',{...request,...bad}));assert.equal(JSON.stringify(state),snapshot);}
run('catalog.request',request,'rfq-idempotent');assert.equal(state.catalogRequests.length,1);const once=state;assert.equal(m.applyCommand(state,{id:'rfq-idempotent',type:'catalog.request',payload:request}),once);const q=state.catalogRequests[0];assert.equal(q.status,'Preparada');assert.equal(q.quantity,300);assert.equal(q.sourceUrl,product.sourceUrl);
state.projects[0].name='Changed';assert.equal(q.project.name,'Torre catálogo');
const reply={requestId:q.id,unitPrice:1200,validUntil:new Date(Date.now()+2*86400000).toISOString(),leadDays:30,depositPercent:20,conditions:'Incluye fabricación, ensayos y documentación técnica; transporte a cotizar.'};
for(const bad of [{unitPrice:-1},{leadDays:-1},{depositPercent:101},{validUntil:'2020-01-01'},{conditions:''}])assert.throws(()=>run('catalog.respond',{...reply,...bad}));
run('catalog.respond',reply);assert.equal(state.catalogRequests[0].status,'Cotizada');assert.equal(state.catalogRequests[0].offer.depositPercent,20);assert.equal(JSON.stringify(state.orders),before);assert.equal(JSON.stringify(state.offers),offers);assert.equal(m.snapshot(state).finance.wallet,wallet);run('catalog.archive',{requestId:q.id});assert.throws(()=>run('catalog.respond',reply));assert.ok(m.snapshot(state).catalogRequests.length);
console.log('PASS catalog provenance, unique references, exact company association, RFQ validation and rollback, 3-digit quantities, project snapshots, idempotence, quote conditions and expiry, archive; no fabricated stock, orders or wallet movement.');

const scope=load('components/catalog-departments.ts'),excluded=JSON.parse(fs.readFileSync('components/excluded-retail-products.json'));
assert.ok(refs.every(p=>!excluded.includes(p.name)),'Removed retail products cannot appear in vendor profiles');
assert.ok(refs.some(p=>p.name.includes('Bomba Presurizadora')),'Building water pumps remain available');
const retired={...m.catalog(state)[0],id:'retired-retail',department:'climatizacion',name:'Equipo de hogar'};
state.offers.push(retired);assert.ok(!m.snapshot(state).offers.some(p=>p.id===retired.id),'Saved retired offers do not reappear after refresh');
assert.throws(()=>run('offers',[retired]),/rubro/,'Retired departments cannot be republished');
console.log('PASS removed retail references, preserved construction equipment, saved offer filtering and publication guard.');
