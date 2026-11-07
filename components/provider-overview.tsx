"use client";

import Link from "next/link";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faArrowRight,faCalendarDays,faFileInvoice,faLock,faTriangleExclamation,faTruck,faWallet} from "@fortawesome/free-solid-svg-icons";
import {ReportFilters,useReportFilters} from "./report-filters";
import {useShared} from "./shared-demo";
import {useSupplierOffers} from "./supplier-offers";
import {orderAccount} from "../lib/account-summary";
import {formatMoney} from "./shared-orders";

export function ProviderOverview({supplierSlug}:{supplierSlug:string}){
 const {state,ready}=useShared();
 const products=useSupplierOffers().filter(p=>p.supplier.slug===supplierSlug);
 const all=(state?.orders??[]).filter(o=>o.supplierSlug===supplierSlug);
 const report=useReportFilters(all.map(o=>({projectId:o.project.id,date:o.createdAt})));
 const orders=all.filter(o=>report.matchesProject(o.project.id)&&report.matchesDate(o.createdAt));
 const active=orders.filter(o=>o.status!=="Cancelada");
 const pending=all.filter(o=>o.status==="Pendiente");
 const totals=active.reduce((sum,o)=>{const a=orderAccount(o,state?.finance);return {sold:sum.sold+a.total,held:sum.held+a.held,paid:sum.paid+a.paid,receivable:sum.receivable+a.receivable};},{sold:0,held:0,paid:0,receivable:0});
 const stages=["Pendiente","Aceptada","En preparación","Despachada","Recibida"];
 const projects=[...new Map(all.map(o=>[o.project.id,o.project])).values()];
 const projectSales=projects.map(project=>({project,amount:active.filter(o=>o.project.id===project.id).reduce((n,o)=>n+orderAccount(o,state?.finance).total,0)})).filter(p=>p.amount>0).sort((a,b)=>b.amount-a.amount);
 const metrics=[
  {label:"Ventas del período",value:formatMoney(totals.sold),note:`${active.length} órdenes · ${projectSales.length} proyectos`,color:"blue",icon:faFileInvoice,href:"/ordenes",action:"Ver ventas"},
  {label:"Fondos en reserva",value:formatMoney(totals.held),note:"Vinculados a las órdenes de tu empresa",color:"blue",icon:faLock,href:"/cuentas",action:"Revisar reservas"},
  {label:"Cobros registrados",value:formatMoney(totals.paid),note:"Pagos vinculados a tus entregas",color:"green",icon:faWallet,href:"/cuentas",action:"Ver estado de cuenta"},
  {label:"Por despachar",value:String(active.filter(o=>["Aceptada","En preparación"].includes(o.status)).length),note:`${products.length} productos en tu catálogo`,color:"orange",icon:faTruck,href:"/despachos",action:"Gestionar despachos"},
 ];
 return <div className="oc-overview provider-overview">
  <section className="ov-toolbar"><span className="ov-date"><FontAwesomeIcon icon={faCalendarDays}/>{new Date().toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}</span><div className="ov-heading-weather"><h2>Tus ventas,<br/><span>Bajo Control</span></h2><p>Pedidos, productos y cobros.<br/>Lo que pasa y lo que necesita tu atención.</p></div></section>
  {pending.length>0&&<section className="ov-attention-banner"><span className="ov-alert-symbol"><FontAwesomeIcon icon={faTriangleExclamation}/></span><div><strong>{pending.length} {pending.length===1?"orden necesita":"órdenes necesitan"} tu aceptación</strong><p>Revisá stock, condiciones y fecha de entrega antes de confirmar.</p></div><Link href={'/ordenes?orden='+encodeURIComponent(pending[0].id)}>Revisar ahora <FontAwesomeIcon icon={faArrowRight}/></Link></section>}
  <ReportFilters filter={report} projects={projects} count={orders.length} dateLabel="Fecha de venta" noun="orden" applyLabel="Ver Resumen"/>
  {!ready&&<p role="status" className="workspace-toolbar">Cargando las ventas de tu empresa…</p>}
  <section className="ov-kpis" aria-label="Indicadores de ventas">{metrics.map(metric=><Link key={metric.label} href={metric.href} className={'ov-kpi '+metric.color}><span className="ov-kpi-top"><span>{metric.label}</span><i><FontAwesomeIcon icon={metric.icon}/></i></span><strong>{metric.value}</strong><span className="ov-kpi-note">{metric.note}</span><span className="ov-kpi-bottom">{metric.action}<FontAwesomeIcon icon={faArrowRight}/></span></Link>)}</section>
  <div className="provider-overview-grid"><section className="ov-panel"><header className="provider-panel-head"><div><h3>Estado de tus pedidos</h3><p>Órdenes del período seleccionado</p></div><Link href="/ordenes">Ver ventas <FontAwesomeIcon icon={faArrowRight}/></Link></header><div className="provider-stage-chart">{stages.map(stage=>{const count=orders.filter(o=>o.status===stage).length;return <div key={stage}><span>{stage}</span><div className="provider-stage-track"><span style={{width:`${count/Math.max(1,orders.length)*100}%`}}/></div><strong>{count}</strong></div>;})}</div></section>
  <section className="ov-panel"><header className="provider-panel-head"><div><h3>Ventas por proyecto</h3><p>Importes de órdenes activas</p></div></header>{projectSales.length?<div className="provider-project-sales">{projectSales.map(({project,amount})=><div key={project.id}><span>{project.name}</span><strong>{formatMoney(amount)}</strong><progress max={Math.max(...projectSales.map(p=>p.amount))} value={amount} aria-label={`Ventas de ${project.name}`}/></div>)}</div>:<p className="ov-empty">No hay ventas para los filtros seleccionados.</p>}</section></div>
  <section className="ov-panel"><header className="provider-panel-head"><div><h3>Últimas órdenes</h3><p>Proyecto, estado y acciones de cada venta</p></div><Link href="/ordenes">Ver todas <FontAwesomeIcon icon={faArrowRight}/></Link></header><div className="provider-recent-orders">{[...orders].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5).map(o=><Link href={'/ordenes?orden='+encodeURIComponent(o.id)} key={o.id}><div><strong>{o.project.name}</strong><small>{o.id}</small></div><span className={'pc-tag '+(o.status==='Recibida'?'green':o.status==='Cancelada'?'red':'blue')}>{o.status}</span><strong>{formatMoney(orderAccount(o,state?.finance).total)}</strong><FontAwesomeIcon icon={faArrowRight}/></Link>)}{!orders.length&&<p className="ov-empty">Las órdenes recibidas aparecerán acá.</p>}</div></section>
 </div>;
}
