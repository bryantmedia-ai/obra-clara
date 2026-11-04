"use client";

import {useEffect,useId,useRef,useState} from "react";
import {productImage} from "./product-images";
import Link from "next/link";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCartShopping,faXmark} from "@fortawesome/free-solid-svg-icons";
import {useSupplierOffers} from "./supplier-offers";
import {cartSaleUnits} from "./sale-units";
import {useCart,updateCart} from "./cart-store";
import {useProjects} from "./project-store";
import {projectCode,projectAddress} from "./project-data";
import {transportServices} from "./transport-data";
import {getTransportProviders} from "./transport-providers";

const money=(n:number)=>`${n.toLocaleString("es-AR")} ARGt`;

export function CartPopup(){
 const cart=useCart();
 const projects=useProjects();
 const catalog=useSupplierOffers();
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 const closeButton=useRef<HTMLButtonElement>(null);
 const id=useId();
 const count=cart.products.length+cart.transports.length;
 const total=cart.products.reduce((sum,p)=>sum+p.quantity*p.unitPrice,0);
 function assignLine(id:string,projectId:string){const p=projects.find(p=>p.id===projectId);updateCart(s=>({...s,products:s.products.map(x=>x.id===id?{...x,projectId}:x),transports:s.transports.map(t=>t.productId===id?{...t,projectId,dropoff:p?projectAddress(p):"",floor:p?.floor??"Planta baja",quoteId:undefined}:t)}));}

 function closeWithFocus(){setOpen(false);trigger.current?.focus();}
 useEffect(()=>{
  if(!open)return;
  closeButton.current?.focus();
  const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);trigger.current?.focus();}};
  document.addEventListener("pointerdown",outside);
  document.addEventListener("keydown",escape);
  return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
 },[open]);
 return <div className="cart-popup-anchor" ref={root} onBlur={event=>{if(event.relatedTarget instanceof Node&&!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
  <button ref={trigger} type="button" className={`icon-button cart-shortcut${open?" cart-shortcut-open":""}`} onClick={()=>setOpen(value=>!value)} aria-label={`Carrito, ${count} ítems`} aria-expanded={open} aria-controls={id} aria-haspopup="dialog"><FontAwesomeIcon icon={faCartShopping}/>{count>0&&<span>{count}</span>}</button>
  {open&&<section id={id} className="cart-popup" role="dialog" aria-label="Mi carrito">
   <div className="cart-popup-heading"><div><h2>Mi carrito</h2><p>{count} {count===1?"ítem agregado":"ítems agregados"}</p></div><button ref={closeButton} type="button" className="cart-popup-close" aria-label="Cerrar carrito" onClick={closeWithFocus}><FontAwesomeIcon icon={faXmark}/></button></div>
   <div className="cart-popup-items">
    {!count&&<div className="cart-popup-empty"><FontAwesomeIcon icon={faCartShopping}/><strong>Tu carrito está vacío</strong><p>Agregá productos o transportes para tu obra.</p></div>}
    {cart.products.map(product=><article className="cart-popup-item" key={product.id}><img src={productImage(product.image)} alt=""/><div><h3>{product.name}</h3><p>{product.supplier}</p><label className={"cart-popup-project "+(!product.projectId?"unassigned":"")}><span>Proyecto</span><select aria-label={`Proyecto de ${product.name} en carrito`} title={projects.find(p=>p.id===product.projectId)?.name??"Sin asignar"} value={product.projectId??""} onChange={e=>assignLine(product.id,e.target.value)}><option value="">Sin asignar</option>{projects.map(p=><option key={p.id} value={p.id} title={p.name}>{projectCode(p)}</option>)}</select></label><span>{cartSaleUnits(product.quantity,product.saleLabel??catalog.find(p=>p.id===(product.offerId??product.id))?.saleLabel,product.unit??catalog.find(p=>p.id===(product.offerId??product.id))?.unit)}{product.unit?` · ${product.unit}`:""}</span><strong>{money(product.quantity*product.unitPrice)}</strong></div></article>)}
    {cart.transports.map(transport=>{const service=transportServices.find(s=>s.id===transport.serviceId);const provider=getTransportProviders(transport.serviceId).find(p=>p.id===transport.providerId);return <article className="cart-popup-item" key={transport.key}>{service&&<img src={`/transport/${service.image}.jpg`} alt=""/>}<div><span className="cart-popup-kind">Transporte</span><h3>{service?.name??"Flete del proveedor"}</h3><p>{provider?.name??"Proveedor a confirmar"}</p><strong>A cotizar</strong></div></article>;})}
   </div>
   <div className="cart-popup-footer">{cart.products.some(p=>!p.projectId)&&<p className="cart-popup-project-warning">{cart.products.filter(p=>!p.projectId).length} producto(s) sin proyecto. Asigná un destino para finalizar.</p>}{count>0&&<><div className="cart-popup-total"><span>Subtotal de productos</span><strong>{money(total)}</strong></div>{cart.transports.length>0&&<p>Transporte a cotizar según el recorrido.</p>}</>}<Link href="/carrito" onClick={()=>setOpen(false)} className="cart-popup-full">Ver mi carrito completo <span aria-hidden="true">→</span></Link></div>
  </section>}
 </div>;
}
