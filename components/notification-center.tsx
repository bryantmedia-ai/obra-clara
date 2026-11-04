"use client";
import {useEffect,useRef,useState} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBell,faXmark} from '@fortawesome/free-solid-svg-icons';
import {useShared} from './shared-demo';
export function NotificationCenter({supplierSlug}:{supplierSlug?:string}){
 const {state,ready}=useShared(),[open,setOpen]=useState(false),ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))setOpen(false);};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[open]);
 const orders=(state?.orders??[]).filter(o=>!supplierSlug||o.supplierSlug===supplierSlug);
 const notices:{id:string;title:string;detail:string;href:string;tone:string}[]=[];
 for(const o of orders){if(supplierSlug&&o.status==='Pendiente')notices.push({id:o.id,title:'Orden pendiente de aceptación',detail:o.project.name+' · '+o.id,href:'/ordenes?orden='+encodeURIComponent(o.id),tone:'orange'});else if(!supplierSlug&&o.status==='Despachada'&&o.lines.some(l=>l.received<l.quantity))notices.push({id:o.id,title:'Entrega pendiente de conformidad',detail:o.project.name+' · '+o.id,href:'/compras/entregas?orden='+encodeURIComponent(o.id),tone:'blue'});}
 for(const q of state?.productQuotes??[]){if(supplierSlug?q.supplierSlug===supplierSlug&&q.status==='Solicitada':q.status==='Cotizada')notices.unshift({id:q.id,title:supplierSlug?'Nueva solicitud de cotización':'Cotización para revisar',detail:q.name+' · '+q.project.name,href:supplierSlug?'/cotizaciones':'/compras/cotizaciones',tone:'orange'});}
 const visible=notices.slice(0,6);
 return <div className="notification-center" ref={ref}><button className="icon-button" type="button" aria-label={'Notificaciones'+(notices.length?', '+notices.length+' pendientes':'')} aria-expanded={open} aria-controls="notification-panel" onClick={()=>setOpen(v=>!v)}><FontAwesomeIcon icon={faBell}/>{notices.length>0&&<span className="notification-dot"/>}</button>{open&&<section className="notification-panel" id="notification-panel" aria-label="Notificaciones"><header><div><strong>Notificaciones</strong><small>{ready?notices.length+' pendientes':'Cargando actividad…'}</small></div><button type="button" className="icon-button" aria-label="Cerrar notificaciones" onClick={()=>setOpen(false)}><FontAwesomeIcon icon={faXmark}/></button></header>{visible.length?visible.map(n=><a key={n.id} href={n.href} onClick={()=>setOpen(false)}><i className={n.tone}/><span><strong>{n.title}</strong><small>{n.detail}</small></span><b aria-hidden="true">→</b></a>):<p>Estás al día. Las novedades de tus órdenes y cotizaciones aparecerán acá.</p>}</section>}</div>;
}
