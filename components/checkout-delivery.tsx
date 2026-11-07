"use client";
import {DateInput} from './date-input';
import {defaultOrderDelivery,type OrderDelivery} from '../lib/order-delivery';
import {LIVE_CEMENT_OFFER_ID, LIVE_CEMENT_PROJECT_ID} from "../lib/fuji-asset";
import {financeTodayFallback} from '../lib/procurement-source';
import type {Project} from './project-data';
import {projectCode} from './project-data';
import {updateCart,type CartState} from './cart-store';

export function checkoutDelivery(cart:CartState,project:Project){
 const saved=cart.deliveries?.[project.id];
 if(saved)return saved;
 const defaults=defaultOrderDelivery(project);
 const demo=project.id===LIVE_CEMENT_PROJECT_ID&&cart.products.some(line=>line.projectId===project.id&&(line.offerId??line.id)===LIVE_CEMENT_OFFER_ID);
 return demo?{...defaults,requestedDate:financeTodayFallback(),notes:project.notes||""}:defaults;
}
export function CheckoutDelivery({cart,projects}:{cart:CartState;projects:Project[]}){
 const destinations=projects.filter(p=>cart.products.some(line=>line.projectId===p.id));
 function patch(project:Project,change:Partial<OrderDelivery>){updateCart(s=>({...s,deliveries:{...s.deliveries,[project.id]:{...checkoutDelivery(s,project),...change}}}));}
 return destinations.length?<section className="panel checkout-delivery"><h2>¿Dónde y cuándo recibís?</h2><p>Completamos los datos de tu proyecto. Podés ajustarlos para esta compra sin modificar la obra guardada.</p>{destinations.map(project=>{const value=checkoutDelivery(cart,project);return <fieldset key={project.id}><legend>{projectCode(project)} · {project.name}</legend><label className="cart-field">Dirección de entrega *<textarea aria-label={'Dirección de entrega para '+project.name} maxLength={400} value={value.address} onChange={e=>patch(project,{address:e.target.value})}/></label><div className="checkout-delivery-grid"><label className="cart-field">Persona que recibe *<input aria-label={'Persona que recibe en '+project.name} maxLength={150} value={value.contactName} onChange={e=>patch(project,{contactName:e.target.value})}/></label><label className="cart-field">Teléfono de contacto *<input aria-label={'Teléfono de entrega para '+project.name} type="tel" maxLength={80} value={value.contactPhone} onChange={e=>patch(project,{contactPhone:e.target.value})}/></label><DateInput label={'Fecha preferida · '+projectCode(project)+' (opcional)'} name={'delivery-date-'+project.id} value={value.requestedDate} onChange={date=>patch(project,{requestedDate:date})} min={financeTodayFallback()} today={financeTodayFallback()}/><label className="cart-field">Franja preferida<select aria-label={'Franja de entrega para '+project.name} value={value.timeWindow} onChange={e=>patch(project,{timeWindow:e.target.value})}>{['A coordinar con el proveedor','08:00 a 12:00','12:00 a 16:00','16:00 a 18:00','08:00 a 16:00'].map(time=><option key={time}>{time}</option>)}</select></label></div><label className="cart-field">Indicaciones para recibir (opcional)<textarea aria-label={'Indicaciones de entrega para '+project.name} maxLength={1000} placeholder="Acceso, timbre, sector de descarga…" value={value.notes} onChange={e=>patch(project,{notes:e.target.value})}/></label></fieldset>;})}<p className="checkout-delivery-note">El proveedor organiza el vehículo y la entrega. La fecha y franja solicitadas quedan sujetas a su confirmación. Si algún producto no incluye envío, el costo se acuerda por separado y no se suma automáticamente.</p></section>:null;
}
