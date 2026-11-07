"use client";
import {useProviders} from "./provider-store";
import {useSupplierOffers} from "./supplier-offers";
import {productImage} from "./product-images";
import Link from "next/link";
import {useState} from "react";
import {cementSuppliers,completeMarketplaceCatalog,filterMarketplaceProducts,groupCatalogReferences,productCategories} from "./marketplace-data";
import {defaultMarketFilters,marketplaceHref,referenceMarketplaceHref} from "./catalog-links";

type IndexFilters={query:string;category:string;productType:string;model:string;supplier:string;brand:string};
const empty:IndexFilters={query:"",category:"",productType:"",model:"",supplier:"",brand:""};
export function SupplierProductIndex({supplierSlug=""}:{supplierSlug?:string}){
 const catalog=useSupplierOffers();
 const providers=useProviders();
 const categories=[...new Set([...productCategories,...catalog.map(p=>p.category??"Corralón")])];
 const [filters,setFilters]=useState<IndexFilters>(empty);
 const [page,setPage]=useState(1);
 const [pageSize,setPageSize]=useState(25);
 const supplier=supplierSlug||filters.supplier;
 const source=catalog.filter(product=>!supplier||product.supplier.slug===supplier);
 const scoped=source.filter(product=>!filters.category||product.category===filters.category);
 const types=[...new Set(scoped.filter(p=>!filters.brand||p.brand===filters.brand).map(p=>p.productType))].sort((a,b)=>a.localeCompare(b,"es"));
 const models=[...new Set(scoped.filter(p=>(!filters.productType||p.productType===filters.productType)&&(!filters.brand||p.brand===filters.brand)).map(p=>p.model))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));
 const brands=[...new Set(scoped.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,"es"));
 const offers=filterMarketplaceProducts({...defaultMarketFilters,categories:filters.category?[filters.category]:[],query:filters.query,supplier,brand:filters.brand,productType:filters.productType,model:filters.model},catalog);
 const references=groupCatalogReferences(offers).sort((a,b)=>a.category.localeCompare(b.category,"es")||a.productType.localeCompare(b.productType,"es")||a.name.localeCompare(b.name,"es"));
 const pages=Math.max(1,Math.ceil(references.length/pageSize));
 const currentPage=Math.min(page,pages);
 const start=(currentPage-1)*pageSize;
 const visible=references.slice(start,start+pageSize);
 function update(patch:Partial<IndexFilters>){setFilters(current=>({...current,...patch}));setPage(1);}
 const allHref=marketplaceHref({completeCatalog:true,supplier,categories:filters.category?[filters.category]:[],query:filters.query,brand:filters.brand,productType:filters.productType,model:filters.model});
 return <section className="panel supplier-product-index">
  <div className="section-head supplier-index-heading"><div><h2>{supplierSlug?"Listado completo de productos":"Catálogo de proveedores"}</h2><p>{references.length} productos · {new Set(offers.map(p=>p.supplier.slug)).size} proveedores</p></div><Link className="button secondary" href={allHref}>{references.length} productos en Marketplace ↗</Link></div>
  <div className="supplier-category-links" aria-label="Productos por categoría">{categories.map(category=>{const count=source.filter(p=>p.category===category).length;return count>0&&<Link key={category} href={marketplaceHref({completeCatalog:true,supplier,categories:[category]})}>{category}<strong>{count}</strong></Link>;})}</div>
  <label className="supplier-index-search">Buscar producto, marca, modelo o referencia<input type="search" value={filters.query} onChange={e=>update({query:e.target.value})} placeholder="Ej. rotomartillo, GBH 185-LI, Holcim…"/></label>
  <div className="supplier-index-filters">
   <label>Categoría<select aria-label="Categoría del catálogo de proveedores" value={filters.category} onChange={e=>update({category:e.target.value,productType:"",model:"",brand:""})}><option value="">Todas las categorías</option>{categories.map(category=><option key={category}>{category}</option>)}</select></label>
   <label>Tipo de producto<select aria-label="Tipo de producto del catálogo de proveedores" value={filters.productType} onChange={e=>update({productType:e.target.value,model:""})}><option value="">Todos los tipos</option>{types.map(type=><option key={type}>{type}</option>)}</select></label>
   <label>Modelo / especificación<select aria-label="Modelo del catálogo de proveedores" value={filters.model} onChange={e=>update({model:e.target.value})}><option value="">Todos los modelos</option>{models.map(model=><option key={model}>{model}</option>)}</select></label>
   <label>Marca<select aria-label="Marca del catálogo de proveedores" value={filters.brand} onChange={e=>update({brand:e.target.value,model:""})}><option value="">Todas las marcas</option>{brands.map(brand=><option key={brand}>{brand}</option>)}</select></label>
   {!supplierSlug&&<label>Proveedor<select aria-label="Proveedor del catálogo" value={filters.supplier} onChange={e=>update({supplier:e.target.value,model:""})}><option value="">Todos los proveedores</option>{providers.map(provider=><option key={provider.slug} value={provider.slug}>{provider.name}</option>)}</select></label>}
  </div>
  <div className="supplier-index-tools"><p role="status">{references.length?`Mostrando ${start+1}–${Math.min(start+pageSize,references.length)} de ${references.length} referencias`:"Sin resultados"}</p><label>Por página<select aria-label="Referencias por página" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[10,25,50].map(count=><option key={count}>{count}</option>)}</select></label><button className="text-link" onClick={()=>{setFilters(empty);setPage(1);}}>Limpiar filtros</button></div>
  <div className="supplier-index-table"><table><thead><tr><th>Producto</th><th>Tipo</th><th>Modelo / especificación</th><th>Proveedores</th><th>Productos</th></tr></thead><tbody>{visible.map(reference=>{
   const href=referenceMarketplaceHref(reference,{supplier,query:filters.query,brand:filters.brand});
   return <tr key={reference.id}><td><div className="supplier-index-product"><img src={productImage(reference.image)} alt="" loading="lazy"/><div><Link href={href} prefetch={false}>{reference.name}</Link><small>{reference.brand} · Ref. {reference.referenceCode}</small></div></div></td><td><span className="supplier-index-type">{reference.category}</span><strong>{reference.productType}</strong></td><td>{reference.model}</td><td><div className="supplier-index-providers">{reference.offers.map(product=><Link key={product.id} href={referenceMarketplaceHref(reference,{supplier:product.supplier.slug,query:filters.query,brand:filters.brand})} prefetch={false}>{product.supplier.name} ↗</Link>)}</div></td><td><Link className="supplier-index-count" href={href} prefetch={false} aria-label={`Ver ${reference.offers.length} productos de ${reference.name} en Marketplace`}>{reference.offers.length}<span>Ver productos ↗</span></Link></td></tr>;
  })}</tbody></table></div>
  {!references.length&&<div className="supplier-index-empty"><h3>No encontramos productos con estos filtros.</h3><p>Probá otro tipo, modelo o proveedor.</p></div>}
  <nav className="catalog-pagination supplier-index-pagination" aria-label="Paginación del catálogo de proveedores"><button disabled={currentPage===1} aria-label="Primera página del índice" onClick={()=>setPage(1)}>«</button><button disabled={currentPage===1} aria-label="Página anterior del índice" onClick={()=>setPage(currentPage-1)}>‹</button><label>Página<select aria-label="Elegir página del índice" value={currentPage} onChange={e=>setPage(Number(e.target.value))}>{Array.from({length:pages},(_,i)=><option key={i+1}>{i+1}</option>)}</select>de {pages}</label><button disabled={currentPage===pages} aria-label="Página siguiente del índice" onClick={()=>setPage(currentPage+1)}>›</button><button disabled={currentPage===pages} aria-label="Última página del índice" onClick={()=>setPage(pages)}>»</button></nav>
 </section>;
}
