"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {transportServices,transportGroups,TransportService} from "./transport-data";
import {addCartTransport,useCart,cargoWeightLabel,updateCart} from "./cart-store";
import {FavoriteButton} from "./favorite-button";
import {useFavorites} from "./favorites-store";
import {filterTransportServices} from "./transport-filters";
import {CatalogGrid} from "./catalog-grid";
import {useShared} from "./shared-demo";
import {projectAddress} from "./project-data";
import type {SharedOrder} from "../lib/demo-model";
import {TransportRequests} from "./transport-requests";
import {TransportProviderList} from "./transport-provider-list";

export function TransportCard({service,productId="",order}:{service:TransportService;productId?:string;order?:SharedOrder}){
 const router=useRouter();
 return <article className="product-card transport-card"><FavoriteButton itemId={`transport:${service.id}`} name={service.name}/><div className="transport-photo"><img src={`/transport/${service.image}.jpg`} alt={service.name} loading="lazy"/></div><div className="product-sale-format"><span className="sale-weight">{service.kind}</span><span className="sale-units">Por servicio</span></div><div className="product-body"><h3>{service.name}</h3><p>{service.cargo}</p><span className="badge">{service.group}</span><TransportProviderList serviceId={service.id} onChoose={providerId=>{addCartTransport(service.id,productId,providerId);if(order)updateCart(s=>({...s,transports:s.transports.map((t,i)=>i===s.transports.length-1?{...t,productId:"",orderId:order.id,pickup:order.lines[0]?.pickup??"",projectId:order.project.id,dropoff:projectAddress(order.project),floor:order.project.floor,replaceIncluded:false}:t)}));router.push("/carrito");}}/></div></article>;
}

export function TransportCatalog({embedded=false,favoritesOnly=false}:{embedded?:boolean;favoritesOnly?:boolean}){
 const favorites=useFavorites();
 const [localFavoritesOnly,setLocalFavoritesOnly]=useState(false);
 const [query,setQuery]=useState("");
 const [selectedIds,setSelectedIds]=useState<string[]>([]);
 const [productId,setProductId]=useState("");
 const [view,setView]=useState("catalog");
 const [orderId,setOrderId]=useState("");const {state}=useShared();const linkedOrder=state?.orders.find(o=>o.id===orderId&&o.status!=="Cancelada");
 const cart=useCart();
 const onlyFavorites=favoritesOnly||localFavoritesOnly;
 useEffect(()=>{const params=new URLSearchParams(window.location.search);setProductId(params.get("producto")??"");setOrderId(params.get("orden")??"");if(params.get("vista")==="solicitudes")setView("requests");},[]);
 const product=cart.products.find(p=>p.id===productId);
 const filtered=filterTransportServices({query,selectedIds,favoritesOnly:onlyFavorites,favoriteKeys:favorites});
 const favoriteCount=transportServices.filter(service=>favorites.includes(`transport:${service.id}`)).length;
 function toggleType(id:string){setSelectedIds(selected=>selected.includes(id)?selected.filter(value=>value!==id):[...selected,id]);}
 function toggleGroup(ids:string[]){setSelectedIds(selected=>ids.every(id=>selected.includes(id))?selected.filter(id=>!ids.includes(id)):[...new Set([...selected,...ids])]);}
 function clearFilters(){setSelectedIds([]);setQuery("");setLocalFavoritesOnly(false);}
 const filters=<aside className="market-filters panel transport-filters" aria-label="Filtros de transporte">
  <div><label className="favorites-filter"><input type="checkbox" aria-label="Mostrar transportes favoritos" checked={onlyFavorites} disabled={favoritesOnly} onChange={e=>setLocalFavoritesOnly(e.target.checked)}/><span aria-hidden="true">♥</span>Favoritos<span className="filter-count">{favoriteCount}</span></label></div>
  <div><h3>Tipos de transporte</h3><label><input type="checkbox" checked={!selectedIds.length} onChange={()=>setSelectedIds([])}/>Todos los transportes<span className="filter-count">{transportServices.length}</span></label></div>
  {transportGroups.map(group=>{
   const services=transportServices.filter(service=>service.group===group);
   const ids=services.map(service=>service.id);
   const checked=ids.every(id=>selectedIds.includes(id));
   const partial=!checked&&ids.some(id=>selectedIds.includes(id));
   return <div className="transport-filter-group" key={group}>
    <label className="transport-group-label"><input type="checkbox" aria-label={`Seleccionar todos: ${group}`} checked={checked} ref={node=>{if(node)node.indeterminate=partial;}} onChange={()=>toggleGroup(ids)}/>{group}<span className="filter-count">{services.length}</span></label>
    <details><summary>Ver tipos de {group.toLocaleLowerCase("es")}</summary><div className="transport-type-options">{services.map(service=><label key={service.id}><input type="checkbox" checked={selectedIds.includes(service.id)} onChange={()=>toggleType(service.id)}/>{service.name}</label>)}</div></details>
   </div>;
  })}
  <div><button className="button secondary full" onClick={clearFilters}>Limpiar filtros</button></div>
 </aside>;
 if(!embedded&&view==="requests")return <div className="transport-catalog"><nav className="transport-page-tabs"><button onClick={()=>setView("catalog")}>Catálogo de transportes</button><button className="active" onClick={()=>setView("requests")}>Mis solicitudes</button></nav><TransportRequests orderId={orderId}/></div>;
 return <div className="transport-catalog">{!embedded&&<><nav className="retail-breadcrumbs"><Link href="/marketplace">Marketplace</Link><span>›</span><span>Transporte y entrega</span></nav><nav className="transport-page-tabs"><button className="active" onClick={()=>setView("catalog")}>Catálogo de transportes</button><button onClick={()=>setView("requests")}>Mis solicitudes</button></nav><div className="transport-paths"><article><strong>Solo transporte</strong><p>Elegí vehículo y empresa. Cargá retiro, proyecto, fecha y carga.</p></article><article><strong>Para tus materiales</strong><p>Vinculá un producto o una compra existente. Origen y destino se completan juntos.</p></article><article><strong>Tu propio transportista</strong><p>Registralo en el carrito, incluso si el producto trae envío incluido.</p><Link href="/carrito">Coordinar mi retiro →</Link></article></div></>}
  {!embedded&&<section className="market-introduction"><h2>La entrega también <span className="title-orange">es parte de la compra.</span></h2><p>Desde un flete urbano hasta una carga especial. Elegí el transporte, la descarga y el destino de tu obra.</p></section>}
  {linkedOrder&&<div className="transport-linked"><div><strong>Transporte para la compra {linkedOrder.id}</strong><p>{linkedOrder.project.name} · Retiro: {linkedOrder.lines[0]?.pickup}</p></div><Link href="/carrito">Ver carrito →</Link></div>}{productId&&!product&&<p className="project-required">El producto ya no está en el carrito. Podés contratar un viaje independiente o volver a agregarlo. <Link href="/marketplace">Ver productos →</Link></p>}{product&&<div className="transport-linked"><div><strong>Transporte para {product.name}</strong><p>{product.quantity} {product.quantity===1?"presentación":"presentaciones"} · {cargoWeightLabel(product)} · Retiro: {product.pickup}</p></div><Link href="/carrito">Ver compra →</Link></div>}
  <div className={`transport-layout${embedded?" transport-embedded":""}`}>
   {!embedded&&filters}
   <div className="transport-results">
    {embedded&&<details className="transport-inline-filters"><summary>Filtrar por tipo de transporte</summary>{filters}</details>}
    <div className="transport-toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar vehículo, equipo o tipo de carga…" aria-label="Buscar transporte"/></div>
    <div className="section-head"><h2>{filtered.length} {filtered.length===1?"servicio":"servicios"} de transporte y entrega</h2><Link href="/carrito" className="button secondary">Ver carrito</Link></div>
    <CatalogGrid noun="servicios" resetKey={JSON.stringify([query,selectedIds,onlyFavorites])} items={filtered.map(service=><TransportCard key={service.id} service={service} productId={product?.id??""} order={linkedOrder?{...linkedOrder,project:state?.projects.find(p=>p.id===linkedOrder.project.id)??linkedOrder.project}:undefined}/>)}/>
    {!filtered.length&&<div className="panel"><h3>No encontramos transportes con estos filtros.</h3><p className="muted">Probá otros tipos de transporte o cambiá la búsqueda.</p><button className="button secondary" onClick={clearFilters}>Limpiar filtros</button></div>}
   </div>
  </div>
 </div>;
}
