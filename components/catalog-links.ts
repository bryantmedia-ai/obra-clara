import type {CatalogFilters,CatalogReference} from "./marketplace-data";
export type MarketLocation=CatalogFilters & {favoritesOnly:boolean;completeCatalog:boolean};
export const defaultMarketFilters:MarketLocation={purchaseMode:"",content:"",dimensions:"",color:"",sellerType:"",companySize:"",department:"",minPrice:"",maxPrice:"",categories:[],query:"",supplier:"",brand:"",format:"",today:false,shippingIncludedOnly:false,sort:"arrival",productType:"",model:"",productId:"",referenceId:"",favoritesOnly:false,completeCatalog:false};
type SearchReader={get:(name:string)=>string|null;getAll:(name:string)=>string[]};
export function readMarketFilters(params:SearchReader):MarketLocation{
 return {...defaultMarketFilters,purchaseMode:params.get("compra")??"",content:params.get("contenido")??"",dimensions:params.get("medidas")??"",color:params.get("color")??"",sellerType:params.get("actividad")??"",companySize:params.get("empresa")??"",department:params.get("departamento")??"",minPrice:params.get("desde")??"",maxPrice:params.get("hasta")??"",categories:params.getAll("categoria"),query:params.get("q")??"",supplier:params.get("proveedor")??"",brand:params.get("marca")??"",format:params.get("presentacion")??"",productType:params.get("tipo")??"",model:params.get("modelo")??"",productId:params.get("producto")??"",referenceId:params.get("referencia")??"",today:params.get("hoy")==="1",shippingIncludedOnly:params.get("envio")==="1",sort:params.get("orden")??"arrival",favoritesOnly:params.get("favoritos")==="1",completeCatalog:params.get("catalogo")==="proveedores"};
}
export function marketplaceHref(filters:Partial<MarketLocation>={}){
 const params=new URLSearchParams();
 for(const category of filters.categories??[])params.append("categoria",category);
 for(const [key,value] of Object.entries({compra:filters.purchaseMode,contenido:filters.content,medidas:filters.dimensions,color:filters.color,actividad:filters.sellerType,empresa:filters.companySize,departamento:filters.department,desde:filters.minPrice,hasta:filters.maxPrice,q:filters.query,proveedor:filters.supplier,marca:filters.brand,presentacion:filters.format,tipo:filters.productType,modelo:filters.model,producto:filters.productId,referencia:filters.referenceId}))if(value)params.set(key,value);
 if(filters.today)params.set("hoy","1");
 if(filters.shippingIncludedOnly)params.set("envio","1");
 if(filters.sort&&filters.sort!=="arrival")params.set("orden",filters.sort);
 if(filters.favoritesOnly)params.set("favoritos","1");
 if(filters.completeCatalog)params.set("catalogo","proveedores");
 const query=params.toString();return `/marketplace${query?`?${query}`:""}`;
}

export function referenceMarketplaceHref(reference:Pick<CatalogReference,"id"|"category"|"productType"|"model">,context:Pick<Partial<MarketLocation>,"supplier"|"query"|"brand">={}){
 return marketplaceHref({...context,completeCatalog:true,referenceId:reference.id,categories:[reference.category],productType:reference.productType,model:reference.model});
}
