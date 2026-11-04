"use client";

import {useState} from "react";
import {formatTransportRate,getTransportProviders} from "./transport-providers";

export function TransportProviderList({serviceId,onChoose}:{serviceId:string;onChoose:(id:string)=>void}){
 const [order,setOrder]=useState("match");
 const [pricedOnly,setPricedOnly]=useState(false);
 const [expanded,setExpanded]=useState(false);
 const all=getTransportProviders(serviceId);
 const rows=all.filter(p=>!pricedOnly||p.rate).sort((a,b)=>order==="price"?Number(Boolean(b.rate))-Number(Boolean(a.rate))||(a.rate&&b.rate&&a.rate.currency===b.rate.currency&&a.rate.unit===b.rate.unit?a.rate.amount-b.rate.amount:0):order==="name"?a.name.localeCompare(b.name,"es"):0);
 const visible=expanded?rows:rows.slice(0,2);
 return <section className="transport-offers" aria-label="Elegir proveedor de transporte"><div className="offer-title"><h4>Elegí quién lo realiza</h4><span>{all.length} empresas</span></div>
 <div className="offer-controls"><select aria-label="Ordenar proveedores" value={order} onChange={e=>setOrder(e.target.value)}><option value="match">Servicio publicado primero</option><option value="price">Tarifa publicada primero</option><option value="name">Nombre A–Z</option></select><label><input type="checkbox" checked={pricedOnly} onChange={e=>setPricedOnly(e.target.checked)}/>Con tarifa publicada</label></div>
 {visible.map(provider=><article className="transport-offer" key={provider.id}><div className="offer-company"><span className="offer-initials" aria-hidden="true">{provider.name.split(" ").slice(0,2).map(x=>x[0]).join("")}</span><div><h5>{provider.name}</h5><p>{provider.zone}</p></div></div>
 <strong className="offer-price">{formatTransportRate(provider.rate)}</strong><span className="offer-availability">Disponibilidad a confirmar</span><span className="offer-hours">{provider.hours}</span>
 {!provider.configurationConfirmed&&<span className="offer-configuration">Configuración de unidad a confirmar</span>}
 <details className="offer-details"><summary>Condiciones y fuente</summary><p>{provider.services}</p><p><b>Atención / contratación:</b> {provider.hours}</p>{provider.rate&&<p><b>Referencia publicada:</b> {provider.rate.conditions}</p>}{!provider.configurationConfirmed&&<p>La empresa publica servicios relacionados. Debe confirmar esta configuración específica antes de contratar.</p>}<a href={provider.rate?.source??provider.url} target="_blank" rel="noopener noreferrer">Ver publicación de la empresa ↗</a><small>Relevamiento: 03/11/2026</small></details>
 <button type="button" className="button primary full" aria-label={`Elegir ${provider.name}`} onClick={()=>onChoose(provider.id)}>Elegir proveedor →</button></article>)}
 {!rows.length&&<p className="offer-no-results">No hay tarifas públicas para este filtro. Desactivá el filtro para elegir una empresa y cotizar el recorrido.</p>}
 {rows.length>2&&<button type="button" className="offer-expand" onClick={()=>setExpanded(!expanded)}>{expanded?"Ver menos proveedores":`Ver los ${rows.length} proveedores`}</button>}
 </section>;
}
