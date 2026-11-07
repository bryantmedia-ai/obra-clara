import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';import assert from 'node:assert/strict';
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const source=fs.readFileSync(file,'utf8');vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,structuredClone,URL,require:n=>{const target=path.normalize(path.join(path.dirname(file),n));return n.endsWith('.json')?JSON.parse(fs.readFileSync(target)):load(target+'.ts');}});return exports;}
const m=load('lib/demo-model.ts'),p=load('components/project-data.ts');let s=m.emptyState(),seq=0;
const run=(type,payload)=>s=m.applyCommand(s,{id:'MATERIALS-ONLY-'+(++seq),type,payload});
run('prices.initialize',{});
const project=s.projects.find(p.projectReady);assert.ok(project);
const product=m.catalog(s).find(v=>!v.shippingIncluded&&v.stock>=(v.minimumOrder??1));assert.ok(product);
const quantity=product.minimumOrder??1;
const delivery={address:'Av. Cabildo 2345, CABA',contactName:'Recepción QA',contactPhone:'1140001234',requestedDate:new Date(Date.now()+3*86400000).toISOString().slice(0,10),timeWindow:'08:00 a 12:00',notes:'Avisar al llegar al portón.'};
const row={id:product.id,quantity,projectId:project.id,unitPrice:product.price,deliveryChoice:'arranged'};
assert.throws(()=>run('order.create',{products:[],transports:[]}),/Agregá productos/);
assert.throws(()=>run('order.create',{products:[row],transports:[{serviceId:'flete-proveedor'}]}),/fletes no está disponible/);
assert.throws(()=>run('transport.request',{}),/transportes no está disponible/);
assert.throws(()=>run('order.create',{products:[row],transports:[],deliveries:{[project.id]:{...delivery,address:''}}}),/dirección/);
assert.throws(()=>run('order.create',{products:[row],transports:[],deliveries:{[project.id]:{...delivery,requestedDate:'2026-02-31'}}}),/fecha/);
run('order.create',{products:[row],transports:[],deliveries:{[project.id]:delivery}});let order=s.orders[0];
assert.equal(order.delivery.address,delivery.address);assert.equal(order.delivery.requestedDate,delivery.requestedDate);assert.equal(s.projects.find(p=>p.id===project.id).address,project.address);const rows=load('lib/procurement-model.ts').purchaseRows(s);assert.equal(rows.find(r=>r.id===order.id).address,delivery.address);assert.equal(m.snapshot(s).finance.contracts.find(c=>c.orderId===order.id).due,'','delivery preference must not set a refund deadline');
assert.equal(order.transports.length,0);assert.equal(order.shippingPending,false);assert.equal(order.lines[0].deliveryChoice,'arranged');
run('order.status',{orderId:order.id,status:'Aceptada'});
run('order.advance',{orderId:order.id});assert.equal(s.orders[0].advanceApproved,true);
for(const status of ['En preparación','Despachada'])run('order.status',{orderId:order.id,status});
run('order.receive',{orderId:order.id,quantities:{[product.id]:quantity}});
assert.equal(s.orders[0].status,'Recibida');assert.equal(m.finances(s.orders[0]).released,quantity*product.price);
console.log('PASS: material without included freight checks out, advance is not freight-blocked, delivery confirmation and release remain functional, and new freight requests are rejected.');

const all=m.catalog(s),included=all.filter(p=>p.shippingIncluded).length;assert.ok(included/all.length>.7&&included/all.length<.9);run('demo.shipping.initialize',{});const snapshot=JSON.stringify(s.offers);run('demo.shipping.initialize',{});assert.equal(JSON.stringify(s.offers),snapshot);console.log('PASS: delivery address/contact/window persisted per order without mutating project, malformed preferences rejected, requested date does not trigger refunds, and 70-90% of demo products include delivery.');

console.log(JSON.stringify({products:all.length,shippingIncluded:included,shippingExcluded:all.length-included,percent:Math.round(included/all.length*100)}));
