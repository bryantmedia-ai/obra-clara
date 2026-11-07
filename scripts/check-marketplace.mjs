import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
function load(file,dependencies={},extra={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,crypto:webcrypto,require:name=>dependencies[name]??{},...extra});return exports;}
const rows=JSON.parse(fs.readFileSync('components/marketplace-products.json','utf8'));
const departments=load('components/catalog-departments.ts',{'./excluded-retail-products.json':{default:JSON.parse(fs.readFileSync('components/excluded-retail-products.json'))}});
const catalog=load('components/marketplace-data.ts',{'../lib/demo-product-price':load('lib/demo-product-price.ts',{'./fuji-asset':load('lib/fuji-asset.ts')}),'../lib/order-delivery':load('lib/order-delivery.ts'),'./catalog-departments':departments,'./marketplace-products.json':{default:rows},'./catalog-product-details.json':{default:JSON.parse(fs.readFileSync('components/catalog-product-details.json','utf8'))}});
assert.equal(rows.length,180);
assert.equal(catalog.productCategories.length,9);
assert.equal(new Set(rows.map(p=>p.id)).size,180);
assert.equal(new Set(rows.map(p=>p.name)).size,180,'Each listing must be a distinct product');
const defaults={categories:[],query:'',supplier:'',brand:'',format:'',today:false,shippingIncludedOnly:false,sort:'arrival'};
for(const category of catalog.productCategories){
 const matches=catalog.filterMarketplaceProducts({...defaults,categories:[category]});
 assert.equal(matches.length,category==='Herramientas'?19:20,category);
 assert.ok(matches.every(p=>p.category===category));
}
assert.equal(catalog.filterMarketplaceProducts({...defaults,categories:['Electricidad','Sanitarios']}).length,40);
assert.equal(catalog.filterMarketplaceProducts({...defaults,categories:['Transporte y entrega']}).length,0);
assert.equal(catalog.filterMarketplaceProducts({...defaults,categories:['Transporte y entrega','Herramientas']}).length,19);
assert.ok(catalog.filterMarketplaceProducts({...defaults,query:'electrogeno'}).length>0,'Search ignores accents');
assert.ok(catalog.filterMarketplaceProducts({...defaults,categories:['Cables y conductores'],format:'100 m'}).every(p=>p.format==='100 m'));
assert.ok(catalog.filterMarketplaceProducts({...defaults,shippingIncludedOnly:true}).every(p=>p.shippingIncluded));
assert.ok(catalog.filterMarketplaceProducts({...defaults,brand:'Bosch'}).every(p=>p.brand==='Bosch'));
const sorted=catalog.filterMarketplaceProducts({...defaults,sort:'price'});
assert.ok(sorted.length>0&&sorted.every(product=>product.price===5));
const demoCement=catalog.completeMarketplaceCatalog.find(product=>product.id==='corralon-norte-loma');
assert.ok(demoCement.name.endsWith(' (Demo)'));
assert.equal(demoCement.price*100,5);
assert.ok(catalog.completeMarketplaceCatalog.filter(product=>product.id!==demoCement.id).every(product=>product.price===5));
for(const p of rows){
 assert.ok(catalog.productCategories.includes(p.category));
 assert.ok(p.price>0&&p.stock>0);
 assert.ok(p.unit&&p.format&&p.saleLabel&&p.stockUnit&&p.use);
 assert.ok(p.kg===null||Number.isFinite(p.kg)&&p.kg>0,p.id);
 assert.ok(fs.statSync(`public/products/${p.image}`).size>1000,`Missing photo ${p.id}`);
}
assert.ok(rows.filter(p=>p.category==='Grupos electrógenos').every(p=>p.saleLabel==='1 equipo'&&p.format.includes('kVA')&&p.kg===null));
let saved=null;
const store=load('components/cart-store.ts',{'../lib/demo-product-price':load('lib/demo-product-price.ts',{'./fuji-asset':load('lib/fuji-asset.ts')})}, {window:{dispatchEvent(){}},localStorage:{getItem:()=>saved,setItem:(_,v)=>saved=v},Event:class{}});
const cable=catalog.marketplaceProducts.find(p=>p.id==='cables-01');
store.addCartProduct({id:cable.id,name:cable.name,supplier:cable.supplier.name,pickup:cable.supplier.address,quantity:2,unitPrice:cable.price,kg:cable.kg,shippingIncluded:cable.shippingIncluded,image:cable.image,unit:cable.unit,saleLabel:cable.saleLabel});
assert.equal(store.readCart().products[0].unit,cable.unit);
assert.equal(store.readCart().products[0].saleLabel,'1 rollo');
assert.equal(store.cargoWeightLabel({kg:null,quantity:2}),'Peso a confirmar');
assert.equal(store.cargoWeightLabel({kg:25,quantity:4}),'100 kg');
console.log('PASS: 179 active construction products; photos, units, multi-category filters, search, sorting, cart and cargo weight.');

const first=store.readCart().products[0];
store.addCartProduct({...first,quantity:3});
assert.equal(store.readCart().products[0].quantity,5,'Adding again accumulates the requested quantity');
store.addCartProduct({...first,quantity:5},{ensure:true});
assert.equal(store.readCart().products[0].quantity,5,'Requesting transport must not double the product quantity');
store.addCartProduct({...first,quantity:2},{ensure:true});
assert.equal(store.readCart().products[0].quantity,5,'A transport request must retain the larger existing purchase');
store.addCartProduct({...first,quantity:200},{maxQuantity:120});
assert.equal(store.readCart().products[0].quantity,120,'Cannot exceed available stock');
assert.equal(store.normalizeQuantity(-5),1);
assert.equal(store.normalizeQuantity(NaN),1);
assert.equal(store.normalizeQuantity(3.7),3);
assert.equal(store.normalizeQuantity(1000,120),120);
console.log('PASS: selected quantities accumulate, stock limits hold, invalid quantities normalize, transport does not add twice.');

store.addCartProduct({...first,quantity:1},{maxQuantity:50});
assert.equal(store.readCart().products[0].quantity,120,'Adding never reduces an existing purchase when stock changes');

let favoritesRaw=null;
const favoritesStorage={getItem:()=>favoritesRaw,setItem:(_,value)=>{favoritesRaw=value;}};
const favoritesContext={window:{},localStorage:favoritesStorage};
const favorites=load('components/favorites-store.ts',{},favoritesContext);
assert.equal(favorites.readFavorites().length,0);
favorites.toggleFavorite('product:corralon-01');
favorites.toggleFavorite('product:cables-01');
favorites.toggleFavorite('transport:playo');
assert.equal(favorites.readFavorites().length,3);
const restored=load('components/favorites-store.ts',{},favoritesContext);
assert.equal(restored.readFavorites().length,3,'Favorites survive module reload/browser refresh');
assert.ok(restored.readFavorites().includes('transport:playo'),'Transport favorites share the same persisted selection');
let matches=catalog.filterMarketplaceProducts({...defaults,favoriteIds:['corralon-01','cables-01']});
assert.equal(matches.length,2);
assert.equal(catalog.filterMarketplaceProducts({...defaults,favoriteIds:[]}).length,0);
assert.equal(catalog.filterMarketplaceProducts({...defaults,favoriteIds:['corralon-01','cables-01'],categories:['Cables y conductores']}).length,1);
const legacy={...catalog.marketplaceProducts[0],id:'legacy-cement',category:undefined,format:undefined,kg:50};
assert.equal(catalog.filterMarketplaceProducts({...defaults,categories:['Corralón'],favoriteIds:['legacy-cement']},[legacy]).length,1,'Saved supplier-only products can also appear in favorites');
favorites.toggleFavorite('product:corralon-01');
assert.ok(!favorites.readFavorites().includes('product:corralon-01'));
assert.equal(favorites.readFavorites().length,2);
favoritesRaw='{broken';
assert.equal(favorites.readFavorites().length,0,'Malformed browser storage does not crash the catalog');
favoritesRaw='["product:cables-01","product:cables-01",3,null]';
assert.equal(favorites.readFavorites().length,1,'Stored IDs are validated and deduplicated');
console.log('PASS: favorites save/remove, survive refresh, include transports and supplier offers, combine with filters, and handle corrupt storage.');

const links=load('components/catalog-links.ts',{}, {URLSearchParams});
assert.equal(catalog.completeMarketplaceCatalog.length,212,'Supplier index includes all existing catalog offers');
const refs=catalog.groupCatalogReferences(catalog.completeMarketplaceCatalog);
assert.equal(refs.reduce((sum,ref)=>sum+ref.offers.length,0),212,'No offers disappear from the product index');
assert.equal(new Set(refs.map(ref=>ref.id)).size,refs.length);
for(const product of catalog.completeMarketplaceCatalog)assert.ok(product.productType&&product.model&&product.referenceCode&&product.referenceId,product.id);
for(const supplier of catalog.cementSuppliers){
 const href=links.marketplaceHref({supplier:supplier.slug,completeCatalog:true});
 const filters=links.readMarketFilters(new URL(href,'https://obra-clara-gray.vercel.app').searchParams);
 const matches=catalog.filterMarketplaceProducts(filters,catalog.getMarketplaceCatalog(filters));
 assert.equal(matches.length,catalog.getSupplierProducts(supplier.slug).length,'Supplier counter opens its complete matching catalog');
 assert.ok(matches.every(product=>product.supplier.slug===supplier.slug));
}
for(const reference of refs){
 const href=links.referenceMarketplaceHref(reference);
 const filters=links.readMarketFilters(new URL(href,'https://obra-clara-gray.vercel.app').searchParams);
 const matches=catalog.filterMarketplaceProducts(filters,catalog.getMarketplaceCatalog(filters));
 assert.equal(matches.length,reference.offers.length,'Reference counter must match the indexed number of offers');
 assert.ok(matches.every(product=>product.referenceId===reference.id));
 for(const offer of reference.offers){
  const supplierFilters=links.readMarketFilters(new URL(links.referenceMarketplaceHref(reference,{supplier:offer.supplier.slug}),'https://obra-clara-gray.vercel.app').searchParams);
  assert.equal(catalog.filterMarketplaceProducts(supplierFilters,catalog.getMarketplaceCatalog(supplierFilters)).length,1);
 }
}
const drill=catalog.marketplaceProducts.find(p=>p.model==='GBH 185-LI');
assert.ok(drill,'Professional tool models are indexed explicitly');
const specific=links.readMarketFilters(new URL(links.marketplaceHref({categories:['Herramientas'],productType:drill.productType,model:drill.model}),'https://obra-clara-gray.vercel.app').searchParams);
assert.equal(catalog.filterMarketplaceProducts(specific).length,1,'Category/type/model deep link selects the exact variant');
const exact=links.readMarketFilters(new URL(links.marketplaceHref({productId:drill.id}),'https://obra-clara-gray.vercel.app').searchParams);
assert.equal(catalog.filterMarketplaceProducts(exact,catalog.getMarketplaceCatalog(exact))[0].id,drill.id);
const special={query:'caño & unión',categories:['Cables y conductores','Sanitarios'],model:'PN20 25 mm / 4 m',supplier:'corralon-norte',favoritesOnly:true,completeCatalog:true};
const restoredFilters=links.readMarketFilters(new URL(links.marketplaceHref(special),'https://obra-clara-gray.vercel.app').searchParams);
assert.equal(restoredFilters.query,special.query);
assert.equal(restoredFilters.model,special.model);
assert.equal(restoredFilters.categories.join('|'),special.categories.join('|'),'Repeated category parameters survive refresh/back navigation');
assert.equal(restoredFilters.favoritesOnly,true);
console.log(`PASS: ${refs.length} indexed references / 212 offers, provider counters, every product deep link, exact models, URL encoding and refresh-safe filter state.`);

const northOffers=catalog.filterMarketplaceProducts({...defaults,query:'Corralón Norte'},catalog.completeMarketplaceCatalog);
for(const ref of catalog.groupCatalogReferences(northOffers)){
 const selected=links.readMarketFilters(new URL(links.referenceMarketplaceHref(ref,{query:'Corralón Norte'}),'https://obra-clara-gray.vercel.app').searchParams);
 assert.equal(catalog.filterMarketplaceProducts(selected,catalog.getMarketplaceCatalog(selected)).length,ref.offers.length,'Search-scoped counts remain exact after navigation');
}

const quantityInput=load('components/product-quantity.ts');
for(const value of ['100','250','999','1000','9999']){
 assert.equal(quantityInput.quantityDraft(value),true);
 assert.equal(quantityInput.productQuantityState(value,9999).quantity,Number(value));
 assert.equal(quantityInput.productQuantityState(value,9999).valid,true);
}
assert.equal(quantityInput.quantityDraft(''),true);
assert.equal(quantityInput.quantityDraft('1e3'),false);
assert.equal(quantityInput.quantityDraft('2.5'),false);
assert.equal(quantityInput.quantityDraft('-100'),false);
assert.equal(quantityInput.quantityDraft('10000'),false);
assert.equal(quantityInput.productQuantityState('100',47).quantity,100,'Keep the typed amount rather than silently reducing it');
assert.equal(quantityInput.productQuantityState('100',47).valid,false);
assert.equal(quantityInput.productQuantityState('100',47).message,'Stock máximo: 47 U');
assert.equal(quantityInput.productQuantityState('0',200).valid,false);
assert.equal(quantityInput.productQuantityState('',200).valid,false);
console.log('PASS: three/four-digit quantities remain editable, invalid input is rejected, stock violations are explicit.');

const saleUnits=load('components/sale-units.ts');
assert.equal(saleUnits.saleUnits(1,'1 bolsa','Bolsa de 50 kg'),'1 B');
assert.equal(saleUnits.saleUnits(1,'1 paquete','Pack'),'1 P');
assert.equal(saleUnits.saleUnits(10,'10 U','Pack de 10 bolsas de 50 kg'),'10 B');
assert.equal(saleUnits.cartSaleUnits(3,'1 bolsa','Bolsa de 25 kg'),'3 B');
assert.equal(saleUnits.cartSaleUnits(2,'10 U','Pack de 10 bolsas'),'20 B');
assert.equal(saleUnits.saleUnits(1,'1 bolsón'),'1 U');
assert.equal(saleUnits.saleUnits(1,'1 equipo'),'1 U');
console.log('PASS: bags use B, packages P, pack quantities and existing cart items keep the correct unit.');
