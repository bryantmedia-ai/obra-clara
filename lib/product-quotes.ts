import type {Product} from '../components/marketplace-data';
import {projectReady,projectAddress,type Project} from '../components/project-data';
import type {SharedState,SharedOrder} from './demo-model';
import {futureExpiry} from './pricing-model';
export type ProductQuote={id:string;offerId:string;supplierSlug:string;supplier:string;name:string;image:string;unit:string;pickup:string;project:Project;quantity:number;notes:string;createdAt:string;updatedAt:string;status:'Solicitada'|'Cotizada'|'Aceptada'|'Rechazada'|'Cancelada';orderId?:string;offer?:{unitPrice:number;validUntil:string;conditions:string;shippingIncluded:boolean;depositPercent:number;deliveryDays:number;at:string};history:{at:string;action:string}[]};
function fail(message:string):never{throw new Error(message);}
export function changeProductQuote(s:SharedState,type:string,p:Record<string,unknown>,id:string,now:string,products:Product[],reserved:(id:string)=>number){
 s.productQuotes??=[];
 if(type==='quote.request'){
  const product=products.find(v=>v.id===p.offerId);const project=s.projects.find(v=>v.id===p.projectId);
  if(!product||!projectReady(project))fail('Seleccioná un producto y un proyecto activo con los datos completos.');
  const quantity=Number(p.quantity);if(!Number.isInteger(quantity)||quantity<(product.minimumOrder??1)||quantity>9999)fail('Revisá la cantidad solicitada y la compra mínima.');
  if(typeof p.notes!=='string'||p.notes.length>1500)fail('La consulta puede tener hasta 1.500 caracteres.');
  s.productQuotes.unshift({id:'COT-'+id,offerId:product.id,supplierSlug:product.supplier.slug,supplier:product.supplier.name,name:product.name,image:product.image,unit:product.unit,pickup:`Depósito ${product.supplier.name} · ${product.supplier.address}`,project:structuredClone(project!),quantity,notes:p.notes.trim(),createdAt:now,updatedAt:now,status:'Solicitada',history:[{at:now,action:'Cotización solicitada por Compras'}]});return;
 }
 const q=s.productQuotes.find(v=>v.id===p.quoteId);if(!q)fail('Cotización no encontrada.');
 if(type==='quote.respond'){
  if(p.supplierSlug!==q.supplierSlug||!['Solicitada','Cotizada'].includes(q.status))fail('Esta solicitud no puede ser cotizada por la cuenta seleccionada.');
  const unitPrice=Number(p.unitPrice),depositPercent=Number(p.depositPercent??0),deliveryDays=Number(p.deliveryDays);
  if(!Number.isFinite(unitPrice)||unitPrice<=0||unitPrice>1e12||!Number.isFinite(depositPercent)||depositPercent<0||depositPercent>100||!Number.isInteger(deliveryDays)||deliveryDays<0||deliveryDays>365||typeof p.conditions!=='string'||p.conditions.trim().length<5||p.conditions.length>1500||typeof p.shippingIncluded!=='boolean')fail('Completá precio, preparación, envío, anticipo y condiciones de la oferta.');
  q.offer={unitPrice:Math.round(unitPrice*100)/100,validUntil:futureExpiry(p.validUntil,now),conditions:p.conditions.trim(),shippingIncluded:p.shippingIncluded,depositPercent,deliveryDays,at:now};q.status='Cotizada';
 }else if(type==='quote.accept'){
  if(q.status!=='Cotizada'||!q.offer||Date.parse(q.offer.validUntil)<=Date.parse(now))fail('La cotización no está vigente. Pedí una nueva oferta al proveedor.');
  if(p.expectedOfferAt!==q.offer.at)fail('El proveedor actualizó la cotización. Revisá las nuevas condiciones antes de aceptar.');
  const product=products.find(v=>v.id===q.offerId);const project=s.projects.find(v=>v.id===q.project.id);
  if(!product||!projectReady(project)||q.quantity>product.stock-reserved(product.id))fail('El proyecto o el stock ya no están disponibles. Solicitá una nueva confirmación.');
  if(projectAddress(project!)!==projectAddress(q.project))fail('Cambió el destino del proyecto. Pedí una nueva cotización para esa dirección.');
  const order:SharedOrder={id:'OC-COT-'+id,supplierSlug:q.supplierSlug,supplier:q.supplier,requestId:id,project:structuredClone(project!),lines:[{id:product.id,name:q.name,image:q.image,quantity:q.quantity,received:0,unitPrice:q.offer.unitPrice,pickup:q.pickup,depositPercent:q.offer.depositPercent,shippingIncluded:q.offer.shippingIncluded,deliveryChoice:'arranged',quoteId:q.id,priceValidUntil:q.offer.validUntil}],status:'Aceptada',createdAt:now,updatedAt:now,transports:[],shippingPending:false,advanceApproved:false,paid:0,receipts:[],quoteId:q.id,commercialConditions:q.offer.conditions};
  s.orders.unshift(order);q.status='Aceptada';q.orderId=order.id;
 }else if(type==='quote.renew'){
  if(q.status!=='Cotizada'||!q.offer||Date.parse(q.offer.validUntil)>Date.parse(now))fail('Solo se puede renovar una oferta vencida.');q.status='Solicitada';q.offer=undefined;
 }else if(type==='quote.cancel'){
  if(!['Solicitada','Cotizada'].includes(q.status))fail('La solicitud ya se cerró.');q.status='Cancelada';
 }else if(type==='quote.reject'){
  if(q.supplierSlug!==p.supplierSlug||!['Solicitada','Cotizada'].includes(q.status))fail('La solicitud ya se cerró o pertenece a otro proveedor.');q.status='Rechazada';
 }else fail('Operación de cotización no reconocida.');
 q.updatedAt=now;q.history.push({at:now,action:type==='quote.respond'?'Oferta enviada por Ventas':type==='quote.accept'?'Oferta aceptada; orden creada sin ejecutar pago':type==='quote.renew'?'Renovación solicitada por Compras':type==='quote.reject'?'Solicitud rechazada por Ventas':'Solicitud cancelada por Compras'});
}
