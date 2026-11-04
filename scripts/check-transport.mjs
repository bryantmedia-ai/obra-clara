import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";

function loadModule(file, dependencies = {}, context = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const exports = {};
  vm.runInNewContext(output, {exports,require:name=>dependencies[name]??{},...context}, {filename:file});
  return exports;
}
const data = loadModule("components/transport-data.ts");
const providers = loadModule("components/transport-providers.ts", {"./transport-providers.json":{default:JSON.parse(fs.readFileSync("components/transport-providers.json","utf8"))}});
const knownServices=new Set(data.transportServices.map(s=>s.id));
assert.equal(new Set(providers.transportProviders.map(p=>p.id)).size,providers.transportProviders.length);
for(const provider of providers.transportProviders){
 assert.ok(provider.url.startsWith("https://"));
 assert.equal(provider.registration,"unverified","Public research must not imply OC registration");
 for(const id of [...provider.confirmed,...provider.inquiry])assert.ok(knownServices.has(id),id);
 for(const rate of Object.values(provider.rates)){assert.ok(rate.amount>0);assert.ok(rate.currency&&rate.unit&&rate.conditions);}
}
for(const service of data.transportServices)assert.ok(providers.getTransportProviders(service.id).length>=2,`Need choices for ${service.name}`);
assert.equal(new Set(data.transportServices.map(s=>s.id)).size,data.transportServices.length,"Service identifiers must be unique");
assert.equal(new Set(data.transportServices.map(s=>s.image)).size,data.transportServices.length,"Every service must have its own image");
assert.equal(data.transportGroups.length,7);
assert.ok(data.transportServices.length>=75);
for(const service of data.transportServices)assert.ok(data.transportGroups.includes(service.group),service.name);
if(fs.existsSync("public/transport")){
 const hashes=new Set();
 for(const service of data.transportServices){
  const image=fs.readFileSync(`public/transport/${service.image}.jpg`);
  assert.ok(image.length>1000,`Missing image for ${service.name}`);
  const hash=createHash("sha256").update(image).digest("hex");
  assert.ok(!hashes.has(hash),`Duplicate photo for ${service.name}`);
  hashes.add(hash);
 }
}

let raw = null;
const storage = {getItem:()=>raw,setItem:(_,v)=>{raw=v;}};
let updates = 0;
const projectData=loadModule("components/project-data.ts",{"./transport-data":data});
const cart = loadModule("components/cart-store.ts", {"./project-store":{readProjects:()=>projectData.initialProjects},"./project-data":projectData,"./transport-data":data,"./transport-providers":providers,react:{}}, {window:{dispatchEvent:()=>{updates++;}},localStorage:storage,Event:class {},crypto:{randomUUID:()=>`quote-${updates}`}});
assert.equal(cart.readCart().products.length,0);
const product={id:"cement-1",name:"Cemento",supplier:"Proveedor Norte",pickup:"Depósito Norte",quantity:2,unitPrice:15000,kg:50,shippingIncluded:false,image:"cement.jpg"};
cart.addCartProduct(product);
cart.addCartProduct(product,{ensure:true});
assert.equal(cart.readCart().products.length,1,"Adding transport must not duplicate its product");
cart.updateCart(s=>({...s,projectId:"nunez",products:s.products.map(p=>({...p,projectId:"nunez"}))}));
cart.addCartTransport("playo","cement-1");
const linked=cart.readCart().transports[0];
assert.equal(linked.productId,product.id);
assert.equal(linked.pickup,"Depósito Norte");
assert.equal(linked.dropoff,data.projects.find(p=>p.id==="nunez").address);
assert.equal(linked.projectId,"nunez");
cart.addCartTransport("volcador");
const standalone=cart.readCart().transports[1];
assert.equal(standalone.productId,"");
assert.equal(standalone.pickup,"");
const before=cart.readCart().transports.length;
cart.addCartTransport("moto","cement-1","moto-dn");
assert.equal(cart.readCart().transports.at(-1).providerId,"moto-dn");
assert.equal(cart.readCart().transports.at(-1).productId,"cement-1");
cart.addCartTransport("moto","cement-1","vernazza");
assert.equal(cart.readCart().transports.length,before,"Replacing a product transport keeps one active service and rejects an unrelated provider");
assert.equal(cart.readCart().products[0].deliveryChoice,"marketplace");
cart.setDeliveryChoice("cement-1","own");assert.equal(cart.readCart().transports.filter(t=>t.productId==="cement-1").length,0,"Own transport replaces the contracted trip instead of duplicating shipment");
raw="invalid-json";
assert.equal(cart.readCart().products.length,0,"Corrupt browser state must not break the cart");
console.log(`Verified ${data.transportServices.length} services and ${providers.transportProviders.length} sourced providers: coverage, rates, unique assets, provider selection, product linkage, destination autofill and cart persistence.`);

const filters=loadModule('components/transport-filters.ts',{'./transport-data':data});
const base={query:'',selectedIds:[],favoritesOnly:false,favoriteKeys:[]};
assert.equal(filters.filterTransportServices(base).length,data.transportServices.length);
const urban=data.transportServices.filter(s=>s.group==='Urbano').map(s=>s.id);
const heavy=data.transportServices.filter(s=>s.group==='Cargas pesadas').map(s=>s.id);
assert.equal(filters.filterTransportServices({...base,selectedIds:[...urban,...heavy]}).length,urban.length+heavy.length,'Groups can be combined without duplicates');
assert.equal(filters.filterTransportServices({...base,selectedIds:['moto']})[0].id,'moto','Individual transport type is selectable');
assert.equal(filters.filterTransportServices({...base,selectedIds:urban,favoritesOnly:true,favoriteKeys:['transport:moto','transport:playo']}).length,1,'Favorites combine with selected types');
assert.ok(filters.filterTransportServices({...base,query:'hormigon'}).length>0,'Search ignores accents');
assert.equal(filters.filterTransportServices({...base,selectedIds:['missing-type']}).length,0);
console.log('Verified transport filters: all types, multiple groups, individual vehicles, favorites and accent-insensitive search.');
