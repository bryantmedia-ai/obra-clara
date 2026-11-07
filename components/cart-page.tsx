"use client";
import {CheckoutDelivery,checkoutDelivery} from "./checkout-delivery";
import {validateOrderDelivery} from "../lib/order-delivery";
import {financeTodayFallback} from "../lib/procurement-source";
import {useSupplierOffers} from "./supplier-offers";
import {directPriceIssue} from "../lib/pricing-model";
import {QuoteRequest} from "./quote-request";
import type {Product} from "./marketplace-data";
import {priceDate} from "./pricing-ui";
import {sharedCommand} from "./shared-demo";
import {LIVE_CEMENT_OFFER_ID,LIVE_CEMENT_QUANTITY,LIVE_CEMENT_SELLER} from "../lib/fuji-asset";
import {useRouter} from "next/navigation";
import {BuyerIdentity} from "./buyer-identity";
import {groupVendorOrders} from "./vendor-orders";
import {shortSaleLabel} from "./sale-units";
import {useState,useRef} from "react";
import {productImage} from "./product-images";
import Link from "next/link";
import {updateCart,useCart,cargoWeightLabel} from "./cart-store";
import {useProjects} from "./project-store";
import {projectAddress,projectReady,projectCode} from "./project-data";
import {cartProjectIssues} from "./cart-projects";

const money=(n:number)=>`${n.toLocaleString("es-AR")} ARGt`;


export function CartPage(){
 const [submitting,setSubmitting]=useState(false);const attempt=useRef({fingerprint:"",id:""});
 const router=useRouter();
 const catalog=useSupplierOffers();const [quoteProduct,setQuoteProduct]=useState<{product:Product;quantity:number}|null>(null);
 const cart=useCart();const projects=useProjects();const [notice,setNotice]=useState("");
 const projectOptions=projects.map(p=><option key={p.id} value={p.id}>{projectCode(p)} · {p.name}{!projectReady(p)?" · Completar datos":""}</option>);
 function assignProject(productId:string,projectId:string){
  const project=projects.find(p=>p.id===projectId);setNotice("");
  updateCart(s=>({...s,products:s.products.map(p=>!productId||p.id===productId?{...p,projectId}:p),projectId:productId?s.projectId:projectId,transports:s.transports.map(t=>((!productId&&!t.orderId)||t.productId===productId&&!!productId)?{...t,projectId,dropoff:project?projectAddress(project):"",floor:project?.floor??"Planta baja",quoteId:undefined}:t)}));
 }
 const vendorOrders=groupVendorOrders(cart.products);
 const total=cart.products.reduce((n,p)=>n+p.quantity*p.unitPrice,0);
 const pricingIssues=cart.products.flatMap(p=>{const offer=catalog.find(o=>o.id===(p.offerId??p.id));if(!offer)return [`${p.name}: producto no disponible.`];const issue=directPriceIssue(offer);return issue?[`${p.name}: ${issue}`]:offer.price!==p.unitPrice||(p.priceRevision??0)!==(offer.priceRevision??0)?[`${p.name}: revisá y confirmá el precio vigente.`]:[];});
 const deliveryIssues=projects.filter(project=>cart.products.some(p=>p.projectId===project.id)).flatMap(project=>{try{validateOrderDelivery(checkoutDelivery(cart,project),financeTodayFallback());return [];}catch(error){return [project.name+": "+(error instanceof Error?error.message:"Revisá la entrega.")];}});
 const issues=[...cartProjectIssues(cart,projects),...deliveryIssues];
 const demoLine=cart.products.length===1&&(cart.products[0].offerId??cart.products[0].id)===LIVE_CEMENT_OFFER_ID?cart.products[0]:undefined;
 const demoOffer=catalog.find(offer=>offer.id===LIVE_CEMENT_OFFER_ID);
 const demoProject=projects.find(project=>project.id===demoLine?.projectId);
 const canReserve=!!demoLine&&demoLine.quantity===LIVE_CEMENT_QUANTITY&&!!demoOffer&&demoOffer.stock>=LIVE_CEMENT_QUANTITY&&!issues.length&&!pricingIssues.length;
 async function reserve(mode:"partial"|"expiry"){
  if(submitting||!canReserve||!demoProject||!demoLine)return;
  setSubmitting(true);
  setNotice("");
  try{
   const delivery=checkoutDelivery(cart,demoProject);
   const fingerprint=JSON.stringify({mode,projectId:demoProject.id,delivery});
   if(attempt.current.fingerprint!==fingerprint)attempt.current={fingerprint,id:crypto.randomUUID()};
   const deadline=Math.floor(Date.now()/1000)+(mode==="partial"?7*86400:180);
   await sharedCommand("fuji.checkout",{mode,offerId:LIVE_CEMENT_OFFER_ID,quantity:LIVE_CEMENT_QUANTITY,projectId:demoProject.id,seller:LIVE_CEMENT_SELLER,deadline,delivery,demoAutoDispatch:mode==="partial"},attempt.current.id);
   updateCart(state=>({...state,products:state.products.filter(product=>product.id!==demoLine.id)}));
   router.push("/compras");
  }catch(error){setNotice(error instanceof Error?error.message:"No se pudo preparar la reserva.");}
  finally{setSubmitting(false);}
 }
 const bulkProjectId=cart.products.length&&cart.products.every(p=>p.projectId===cart.products[0].projectId)?cart.products[0].projectId??"":"";const selectedProject=projects.find(p=>p.id===bulkProjectId);
 return <div className="cart-layout" data-product-count={cart.products.length}>{quoteProduct&&<QuoteRequest product={quoteProduct.product} quantity={quoteProduct.quantity} onClose={()=>setQuoteProduct(null)}/>}<div className="cart-items"><section className="panel"><div className="section-head"><h2>Tu compra de materiales</h2><Link href="/marketplace">Seguir comprando →</Link></div>
  <label className="cart-field cart-bulk-project">Asignar todos los productos a un proyecto<select value={bulkProjectId} onChange={e=>assignProject("",e.target.value)}><option value="" disabled>{new Set(cart.products.map(p=>p.projectId).filter(Boolean)).size>1?"Carrito mixto · destinos individuales":"Elegí un proyecto para asignar a todos"}</option>{projectOptions}</select></label>
  <p className="cart-mobile-help">Asigná un proyecto a cada producto antes de confirmar.</p><p className="cart-mixed-callout">Podés combinar proveedores y obras. Asigná cada producto a un proyecto completo; generaremos una orden por proveedor y destino. <Link href="/proyectos">Administrar proyectos →</Link></p>

  {issues.length>0&&<div className="project-required" role="status">{issues.map(issue=><p key={issue}>{issue}</p>)}<Link href="/proyectos">Completar datos en Proyectos →</Link></div>}
 </section>
 <CheckoutDelivery cart={cart} projects={projects}/>
 {vendorOrders.length>0&&<section className="panel cart-vendor-orders"><div className="section-head"><div><h2>{vendorOrders.length} {vendorOrders.length===1?"orden":"órdenes"} por vendedor y proyecto</h2><p>Cada proveedor recibe su propia orden, con sus productos, origen y condiciones de pago.</p></div></div>{vendorOrders.map((order,i)=><article key={order.key}><div><span className="vendor-order-number">{String(i+1).padStart(2,"0")}</span><div><strong>{order.supplier}</strong><p>{projects.find(p=>p.id===order.projectId)?.name??"Proyecto sin asignar"} · {order.products.length} productos</p></div></div><dl><div><dt>Materiales</dt><dd>{money(order.subtotal)}</dd></div><div><dt>Anticipo solicitado</dt><dd>{money(order.requestedDeposit)}</dd></div><div><dt>Saldo contra entrega</dt><dd>{money(order.heldBalance)}</dd></div></dl></article>)}</section>}
 {cart.products.map(p=>{const project=projects.find(project=>project.id===p.projectId);const shippingIncluded=catalog.find(offer=>offer.id===(p.offerId??p.id))?.shippingIncluded??p.shippingIncluded;return <article className="panel cart-product" key={p.id}><img src={productImage(p.image)} alt={p.name}/><div className="cart-product-info"><h3>{p.name}</h3><p>{p.supplier}</p>{p.unit&&<p>{p.unit} · Precio por {shortSaleLabel(p.saleLabel??"presentación")}</p>}<p className="cart-address">Retiro: {p.pickup}</p>
  <label className="cart-field cart-project-assignment">Proyecto de este producto<select aria-label={`Proyecto de ${p.name}`} value={p.projectId??""} onChange={e=>assignProject(p.id,e.target.value)}><option value="">Sin asignar · obligatorio para comprar</option>{projectOptions}</select></label>
  {project?<div className="cart-product-destination"><strong>{projectCode(project)} · {project.name}</strong><p>Destino: {checkoutDelivery(cart,project).address}</p></div>:<p className="cart-unassigned">Sin proyecto asignado. Elegí un destino para habilitar la compra.</p>}
  <div className="cart-price-review">{(()=>{const offer=catalog.find(o=>o.id===(p.offerId??p.id));if(!offer)return <p className="pricing-error">El producto ya no está disponible.</p>;const issue=directPriceIssue(offer);return <><small>Precio confirmado hasta {priceDate(offer.priceValidUntil)}</small>{issue?<><p className="pricing-error">{issue}</p><button className="button secondary" onClick={()=>setQuoteProduct({product:offer,quantity:p.quantity})}>Solicitar cotización de este producto</button></>:offer.price!==p.unitPrice||(p.priceRevision??0)!==(offer.priceRevision??0)?<><p>Precio vigente: <strong>{money(offer.price)}</strong> por presentación. Revisá la actualización para continuar.</p><button className="button secondary" onClick={()=>updateCart(s=>({...s,products:s.products.map(x=>x.id===p.id?{...x,unitPrice:offer.price,priceRevision:offer.priceRevision}:x)}))}>Confirmar precio vigente</button></>:<span className="price-status green">Compra directa · precio vigente</span>}</>;})()}</div>
  <div className="cart-quantity"><label>Cantidad<input type="number" aria-label={`Cantidad de ${p.name}`} min={p.minimumOrder??1} max="9999" value={p.quantity} onChange={e=>{setNotice("");updateCart(s=>({...s,products:s.products.map(x=>x.id===p.id?{...x,quantity:Math.max(p.minimumOrder??1,Math.min(9999,Number(e.target.value)||1))}:x)}));}}/></label><strong>{money(p.quantity*p.unitPrice)}</strong><span>{cargoWeightLabel(p)}</span></div>
  <p className="cart-delivery-status">{shippingIncluded?"Incluye envío del proveedor. El proveedor organiza la entrega.":"Envío no incluido. El proveedor coordina la entrega y confirma el costo por separado."}</p>
  <button className="cart-split-project" onClick={()=>{updateCart(s=>({...s,products:[...s.products,{...p,id:(p.offerId??p.id)+"~"+crypto.randomUUID(),offerId:p.offerId??p.id,quantity:p.minimumOrder??1,projectId:""}]}));setNotice("Producto agregado en otra línea. Asignale el proyecto y la cantidad de destino.");}}>Agregar este producto para otro proyecto</button><button className="cart-remove" onClick={()=>{setNotice("");updateCart(s=>({...s,products:s.products.filter(x=>x.id!==p.id),transports:s.transports.map(t=>t.productId===p.id?{...t,productId:"",pickup:"",quoteId:undefined}:t)}));}}>Quitar producto</button></div></article>;})}
 {!cart.products.length&&!cart.transports.length&&<section className="panel cart-empty"><h2>Tu carrito está vacío</h2><p>Agregá los materiales que necesita tu obra.</p><Link className="button primary" href="/marketplace">Buscar productos</Link></section>}
 </div><aside className="panel cart-summary"><h2>Resumen</h2><div className="row"><span>Órdenes por vendedor</span><strong>{vendorOrders.length}</strong></div><div className="row"><span>Productos</span><strong>{cart.products.length}</strong></div><div className="row"><span>Proyectos de destino</span><strong>{new Set([...cart.products,...cart.transports].map(p=>p.projectId).filter(Boolean)).size}</strong></div><div className="row total"><span>Total de materiales</span><strong>{money(total)}</strong></div>
 <BuyerIdentity compact/>
 {demoLine&&<><div className="row"><span>Vendedor</span><strong>{demoLine.supplier}</strong></div><p className="cart-address" title={LIVE_CEMENT_SELLER}>Wallet del vendedor: {LIVE_CEMENT_SELLER.slice(0,10)}…{LIVE_CEMENT_SELLER.slice(-6)}</p></>}
 {issues.length>0&&<p className="project-required">Revisá los datos de entrega para continuar.</p>}
 {pricingIssues.length>0&&<div className="pricing-error" role="status">{pricingIssues.map(issue=><p key={issue}>{issue}</p>)}</div>}
 {demoLine&&demoLine.quantity!==LIVE_CEMENT_QUANTITY&&<p>Elegí 100 bolsas para reservar 5 ARGt.</p>}
 {demoLine&&demoOffer&&demoOffer.stock<LIVE_CEMENT_QUANTITY&&<p>No hay 100 bolsas disponibles.</p>}
 <button className="button primary full" disabled={submitting||!canReserve} onClick={()=>void reserve("partial")}>{submitting?"Preparando…":"Reservar"}</button>
 {demoLine&&<details><summary>Opciones de prueba</summary><button className="button secondary full" disabled={submitting||!canReserve} onClick={()=>void reserve("expiry")}>Probar vencimiento corto</button></details>}
 <Link className="button secondary full" href="/proyectos">Gestionar proyectos</Link>{notice&&<div className="cart-notice" role="status">{notice}</div>}</aside></div>;
}
