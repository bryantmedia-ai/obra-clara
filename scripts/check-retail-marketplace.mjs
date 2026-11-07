import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import assert from 'node:assert/strict';
function load(file,deps={},context={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>deps[n]??(n==="./shared-demo"?{queueShared(){}}:{}),URL,...context});return exports;}
const departments=load('components/catalog-departments.ts',{'./excluded-retail-products.json':{default:JSON.parse(fs.readFileSync('components/excluded-retail-products.json'))}});
const data=load('components/marketplace-data.ts',{'../lib/order-delivery':load('lib/order-delivery.ts'),'./catalog-departments':departments,'./marketplace-products.json':{default:JSON.parse(fs.readFileSync('components/marketplace-products.json'))},'./catalog-product-details.json':{default:JSON.parse(fs.readFileSync('components/catalog-product-details.json'))}});
const links=load('components/catalog-links.ts',{}, {URLSearchParams});const filters={...links.defaultMarketFilters,department:'iluminacion',minPrice:'1000',maxPrice:'9999999'};
assert.equal(departments.catalogDepartments.length,9);assert.equal(new Set(departments.catalogDepartments.map(d=>d.id)).size,9);
assert.ok(data.completeMarketplaceCatalog.every(p=>departments.productDepartment(p)), 'Every existing offer maps to a department');
const selected=data.filterMarketplaceProducts(filters,data.completeMarketplaceCatalog);assert.equal(selected.length,5);assert.ok(selected.every(p=>departments.departmentMatches(p,'iluminacion')));
const restored=links.readMarketFilters(new URL(links.marketplaceHref(filters),'https://obra-clara-gray.vercel.app').searchParams);assert.equal(restored.department,'iluminacion');assert.equal(restored.minPrice,'1000');assert.equal(restored.maxPrice,'9999999');
assert.equal(data.filterMarketplaceProducts({...filters,minPrice:'999999999'},data.completeMarketplaceCatalog).length,0);
const parse=load('components/supplier-catalog-import.ts',{'./catalog-departments':departments}).parseSupplierCatalog;
const row={sku:'SKU-ABC',name:'Cemento CPC40 25 kg',brand:'Marca',category:'Corralón',image:'https://example.com/cemento.jpg',price:5000,stock:100,unit:'Bolsa de 25 kg',format:'25 kg',saleLabel:'1 bolsa',kg:25,shippingIncluded:false};
const supplier=data.cementSuppliers[1];const parsed=parse(JSON.stringify([row]),supplier);assert.equal(parsed[0].supplier.slug,supplier.slug);assert.equal(parsed[0].stock,100);assert.equal(parsed[0].referenceCode,'SKU-ABC');assert.equal(parsed[0].pack,1);
for(const patch of [{price:-1},{stock:1.5},{image:'javascript:alert(1)'},{image:'https://user:password@example.com/image.jpg'},{shippingIncluded:'false'},{kg:-10},{sku:''},{unit:''},{pack:0}])assert.throws(()=>parse(JSON.stringify([{...row,...patch}]),supplier));
assert.throws(()=>parse(JSON.stringify([row,row]),supplier));assert.throws(()=>parse(JSON.stringify([null]),supplier));assert.throws(()=>parse('{}',supplier));assert.throws(()=>parse('not json',supplier));
const images=load('components/product-images.ts');assert.equal(images.productImage('catalog/file.jpg'),'/products/catalog/file.jpg');assert.equal(images.productImage('https://example.com/photo.jpg'),'https://example.com/photo.jpg');
let raw=null,serverReject=false;const store=load('components/supplier-offers.ts',{'./catalog-departments':departments,'./marketplace-data':data,'./shared-demo':{async sharedCommand(type,rows){if(serverReject)throw new Error('Conflicto de stock');assert.equal(type,'offers');const offers=new Map(JSON.parse(raw??'[]').map(p=>[p.id,p]));for(const p of rows)offers.set(p.id,p);raw=JSON.stringify([...offers.values()]);}}},{window:{dispatchEvent(){}},localStorage:{getItem:()=>raw,setItem:(_,v)=>raw=v},Event:class{}});
await store.publishSupplierOffers(parsed);assert.equal(store.readSupplierOffers().length,1);await store.publishSupplierOffers([{...parsed[0],price:7000}]);assert.equal(store.readSupplierOffers().length,1);assert.equal(store.readSupplierOffers()[0].price,7000);serverReject=true;await assert.rejects(store.publishSupplierOffers([{...parsed[0],price:9000}]));assert.equal(store.readSupplierOffers()[0].price,7000);serverReject=false;
const merged=store.applySupplierOffers(data.completeMarketplaceCatalog,store.readSupplierOffers());assert.equal(merged.length,213);assert.equal(merged.find(p=>p.id===parsed[0].id).supplier.slug,supplier.slug);
const override={...data.completeMarketplaceCatalog[0],price:9999};const replaced=store.applySupplierOffers(data.completeMarketplaceCatalog,[override]);assert.equal(replaced.length,212);assert.equal(replaced[0].price,9999);
console.log('PASS: 9 construction departments, classification, price and URL filters, supplier identity, validated bulk import, remote/local images and persistent offer updates.');

const market=load('components/marketplace-model.ts');
assert.ok(market.deliveryRank('Hoy · 10:20')<market.deliveryRank('Hoy · 12:30'));
assert.ok(market.deliveryRank('Hoy · 12:30')<market.deliveryRank('Mañana · 08:00–12:00'));
assert.ok(market.deliveryRank('Mañana · 08:00')<market.deliveryRank('En 3 días'));
assert.deepEqual(Array.from(links.readMarketFilters(new URL('https://example.com/?categoria=Transporte+y+entrega&categoria=Corral%C3%B3n').searchParams).categories),['Corralón']);
console.log('PASS: delivery ordering uses day and time; retired freight category cannot reopen through saved URLs.');

assert.equal(market.productCount(data.completeMarketplaceCatalog),186);
assert.equal(data.completeMarketplaceCatalog.length,212);
const duplicated=[{id:'offer-a',referenceId:'cement-25'},{id:'offer-b',referenceId:'cement-25'},{id:'offer-c',referenceId:'cement-50'}];
assert.equal(market.productCount(duplicated),2,'Two vendor listings of the same product count as one product');
assert.equal(market.productCount([{id:'custom-a'},{id:'custom-b'}]),2,'Products without a shared reference must remain distinct');
assert.equal(market.productCount([]),0);
console.log('PASS: product counts deduplicate supplier listings consistently and preserve custom products without references.');
