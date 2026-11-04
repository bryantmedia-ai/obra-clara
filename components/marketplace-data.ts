import {productContent,productDimensions} from "./product-facets";
import {departmentMatches} from "./catalog-departments";
import rows from "./marketplace-products.json";
import detailRows from "./catalog-product-details.json";
type ProductDetails={productType:string;model:string;referenceId:string;referenceCode:string};
const details=detailRows as Record<string,ProductDetails>;

export const cementSuppliers = [
  {slug:"corralon-norte",businessType:"Corralón",companySize:"Mediana empresa",banner:"/suppliers/corralon-norte.jpg",name:"Corralón Norte",initials:"CN",area:"Vicente López · Zona Norte",description:"Materiales, instalaciones y equipos para desarrollos de varias plantas en Zona Norte. Entregas coordinadas y retiro en depósito.",arrival:"Hoy · 10:20",score:"4,9",orders:42,color:"#e96124",brands:"Avellaneda · Holcim · Loma Negra",address:"Vicente López, Buenos Aires",hours:"Lun a vie 7:00–18:00 · Sáb 8:00–13:00"},
  {slug:"corralon-centro",businessType:"Distribuidor",companySize:"Pequeña empresa",banner:"/suppliers/corralon-centro.jpg",name:"Corralón Centro",initials:"CC",area:"Villa Crespo · CABA",description:"Abastecimiento para edificios y obras urbanas en CABA. Materiales de estructura, instalaciones, terminaciones y seguridad.",arrival:"Hoy · 12:30",score:"4,8",orders:36,color:"#39775b",brands:"Loma Negra · Avellaneda · Holcim",address:"Villa Crespo, Ciudad de Buenos Aires",hours:"Lun a vie 7:30–18:00 · Sáb 8:00–12:30"},
  {slug:"materiales-del-sur",businessType:"Mayorista",companySize:"Gran empresa",banner:"/suppliers/materiales-del-sur.jpg",name:"Materiales del Sur",initials:"MS",area:"Avellaneda · Zona Sur",description:"Insumos y equipos para obras de mayor volumen. Compras por presentación, logística y entregas programadas en Zona Sur y CABA.",arrival:"Mañana · 8:00–12:00",score:"4,7",orders:58,color:"#47788f",brands:"Holcim · Avellaneda · Loma Negra",address:"Avellaneda, Buenos Aires",hours:"Lun a vie 7:00–17:30 · Sáb 8:00–13:00"},
];

export const productCategories=["Corralón","Ferretería","Electricidad","Cables y conductores","Grupos electrógenos","Herramientas","Sanitarios","Pinturas","Seguridad e indumentaria"];
export const marketplaceProducts=rows.map(({supplierIndex,...product})=>({...product,...details[product.id],supplier:cementSuppliers[supplierIndex]}));
export type MarketplaceProduct=typeof marketplaceProducts[number];
export type Product=Omit<MarketplaceProduct,"category"|"format"|"saleLabel"|"stockUnit"> & {content?:string;dimensions?:string;color?:string;minimumOrder?:number;deliveryDays?:number;depositPercent?:number;department?:string;category?:string;format?:string;saleLabel?:string;stockUnit?:string};
export type CatalogFilters={content?:string;dimensions?:string;color?:string;sellerType?:string;companySize?:string;department?:string;minPrice?:string;maxPrice?:string;categories:string[];query:string;supplier:string;brand:string;format:string;today:boolean;shippingIncludedOnly:boolean;sort:string;favoriteIds?:string[];productType?:string;model?:string;productId?:string;referenceId?:string};
const searchable=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es");
export function filterMarketplaceProducts(filters:CatalogFilters,products:Product[]=marketplaceProducts){
 const terms=searchable(filters.query).trim().split(/\s+/).filter(Boolean);
 return products.filter(p=>(!filters.content||productContent(p)===filters.content)&&(!filters.dimensions||productDimensions(p)===filters.dimensions)&&(!filters.color||p.color===filters.color)&&(!filters.sellerType||p.supplier.businessType===filters.sellerType)&&(!filters.companySize||p.supplier.companySize===filters.companySize)&&departmentMatches(p,filters.department)&&(!filters.minPrice||p.price>=Number(filters.minPrice))&&(!filters.maxPrice||p.price<=Number(filters.maxPrice))&&(!filters.productType||p.productType===filters.productType)&&(!filters.model||p.model===filters.model)&&(!filters.productId||p.id===filters.productId)&&(!filters.referenceId||p.referenceId===filters.referenceId)&&(!filters.favoriteIds||filters.favoriteIds.includes(p.id))&&(!filters.categories.length||filters.categories.includes(p.category??"Corralón"))&&(!filters.supplier||p.supplier.slug===filters.supplier)&&(!filters.brand||p.brand===filters.brand)&&(!filters.format||(p.format??`${p.kg} kg`)===filters.format)&&(!filters.today||p.supplier.arrival.startsWith("Hoy"))&&(!filters.shippingIncludedOnly||p.shippingIncluded)&&terms.every(term=>searchable(`${p.name} ${p.productType} ${p.model} ${p.referenceCode} ${p.brand} ${p.category??"Corralón"} ${p.unit} ${p.use} ${p.supplier.name}`).includes(term)))
 .sort((a,b)=>filters.sort==="price"?a.price-b.price:filters.sort==="price-desc"?b.price-a.price:cementSuppliers.indexOf(a.supplier)-cementSuppliers.indexOf(b.supplier));
}

function legacyDetails(item:{key:string;name:string;kg:number},pack=false):ProductDetails{
 return {productType:"Cementos",model:`${item.name}${pack?" · Pack de obra":""}`,referenceId:`cement-${item.key}-${pack?500:item.kg}`,referenceCode:`OC-${item.key.toUpperCase()}-${pack?500:item.kg}`};
}
const range = [
 {key:"avellaneda",name:"Cemento Portland CPC40 Avellaneda",brand:"Cementos Avellaneda",unit:"Bolsa de 50 kg",kg:50,image:"avellaneda-25.jpg",base:15800,use:"Hormigones y morteros"},
 {key:"holcim",name:"Cemento Holcim Fuerte",brand:"Holcim",unit:"Bolsa de 50 kg",kg:50,image:"holcim-25.jpg",base:16200,use:"Construcción general"},
 {key:"loma",name:"Cemento Portland Loma Negra",brand:"Loma Negra",unit:"Bolsa de 50 kg",kg:50,image:"loma-negra-25.jpg",base:16900,use:"Hormigones y morteros"},
 {key:"hidralit",name:"Cemento de albañilería Hidralit",brand:"Cementos Avellaneda",unit:"Bolsa de 20 kg",kg:20,image:"hidralit-20.jpg",base:7400,use:"Mampostería y revoques · No estructural"},
];

export const cementProducts = cementSuppliers.flatMap((supplier,i) => {
  const singles = range.map((item,j)=>({...item,...legacyDetails(item),category:"Corralón",id:`${supplier.slug}-${item.key}`,supplier,price:item.base+i*350,stock:120+i*70+j*23,pack:1,shippingIncluded:(i*7+j*3)%5<3}));
  const item = range[i];
  return [...singles,{...item,...legacyDetails(item,true),category:"Corralón",id:`${supplier.slug}-pack`,name:`${item.name} · Pack de obra`,unit:"Pack de 10 bolsas × 50 kg · 500 kg",kg:500,supplier,price:(item.base+i*350)*9.5,stock:12+i*5,pack:10,shippingIncluded:i%2===1}];
});

// Additional prototype offers share one product reference and retain each seller's identity.
export const crossSupplierOffers:Product[]=productCategories.flatMap(category=>{const product=marketplaceProducts.find(p=>p.category===category)!;return cementSuppliers.filter(s=>s.slug!==product.supplier.slug).map((supplier,i)=>({...product,id:`${supplier.slug}-offer-${product.id}`,supplier,price:Math.round(product.price*(1.025+i*.035)),stock:Math.max(50,product.stock+35+i*22),minimumOrder:i===0?1:5,deliveryDays:i+2,depositPercent:0,shippingIncluded:i===0}));});
export const completeMarketplaceCatalog:Product[]=[...marketplaceProducts,...cementProducts,...crossSupplierOffers];
export function getSupplierProducts(slug:string,products:Product[]=completeMarketplaceCatalog){return products.filter(product=>product.supplier.slug===slug);}
export type CatalogReference={id:string;name:string;brand:string;category:string;productType:string;model:string;referenceCode:string;image:string;offers:Product[]};
export function groupCatalogReferences(products:Product[]){
 const grouped=new Map<string,CatalogReference>();
 for(const product of products){
  const existing=grouped.get(product.referenceId);
  if(existing)existing.offers.push(product);
  else grouped.set(product.referenceId,{id:product.referenceId,name:product.name,brand:product.brand,category:product.category??"Corralón",productType:product.productType,model:product.model,referenceCode:product.referenceCode,image:product.image,offers:[product]});
 }
 return [...grouped.values()];
}

export function getMarketplaceCatalog(filters:{completeCatalog?:boolean;supplier?:string;productId?:string;referenceId?:string;favoritesOnly?:boolean}){
 return filters.completeCatalog||filters.supplier||filters.productId||filters.referenceId||filters.favoritesOnly?completeMarketplaceCatalog:marketplaceProducts;
}
