import type {SharedState} from './demo-model';
import type {CartState,CartTransport} from '../components/cart-store';
import {projectReady,projectAddress,type Project} from '../components/project-data';
import {getTransportProviders} from '../components/transport-providers';
import {transportServices} from '../components/transport-data';
import {transportQuote} from '../components/cart-projects';
export type TransportRequest=CartTransport&{offerId?:string;id:string;requestId:string;project:Project;serviceName:string;providerName:string;materialSupplierSlug?:string;cargo:string;amount:number|null;conditions:string;status:'Solicitada'|'Cotizada'|'Confirmada'|'En camino'|'Entregada'|'Cancelada';own:boolean;contact:string;phone:string;vehicle:string;createdAt:string;updatedAt:string;history:{at:string;action:string}[]};
const reject=(s:string):never=>{throw new Error(s);};
const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export function makeTransportRequests(s:SharedState,cart:CartState,commandId:string,now:string,orderByLine:Map<string,string>){
 const requests:TransportRequest[]=[];const seen=new Set<string>();
 for(const t of cart.transports){
  if(seen.has(t.key))reject('Transporte repetido.');seen.add(t.key);
  const service=transportServices.find(v=>v.id===t.serviceId);if(!service)reject('Tipo de transporte no válido.');
  const product=cart.products.find(v=>v.id===t.productId);if(t.productId&&!product)reject('El producto vinculado ya no está en el carrito.');
  if(product&&product.deliveryChoice==='own')reject('Elegí transporte propio o contratado para este producto, sin duplicar el envío.');
  if(product?.shippingIncluded&&product.deliveryChoice!=='marketplace')reject('Confirmá el reemplazo del envío incluido antes de contratar otro transporte.');
  const existing=t.orderId?s.orders.find(v=>v.id===t.orderId&&v.status!=='Cancelada'):undefined;
  if(t.orderId&&!existing)reject('La compra vinculada no existe o está cancelada.');
  if(existing&&!t.replaceIncluded)reject('Confirmá el reemplazo de la coordinación de envío de esta compra.');
  if(existing&&(s.transportRequests??[]).some(r=>r.orderId===existing.id&&!['Cancelada','Entregada'].includes(r.status)))reject('Esta compra ya tiene un transporte en curso. Cancelalo antes de reemplazarlo.');
  const project=s.projects.find(v=>v.id===t.projectId);if(!projectReady(project))reject('Asigná el transporte a un proyecto activo y completo.');
  if(t.dropoff!==projectAddress(project!))reject('El destino debe coincidir con el proyecto.');
  if(product&&(product.projectId!==t.projectId||t.pickup!==product.pickup))reject('El retiro y el proyecto deben coincidir con el producto.');
  if(existing&&(existing.project.id!==t.projectId||!existing.lines.some(l=>l.pickup===t.pickup)))reject('El origen y el destino deben coincidir con la compra vinculada.');
  if(!t.pickup?.trim()||!validDate(t.date)||!t.time?.trim()||!t.floor?.trim())reject('Completá retiro, fecha, horario y sector de descarga.');
  if(t.date<new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(now)))reject('La fecha de transporte no puede estar en el pasado.');
  const quote=transportQuote(cart,t,s.projects);const provider=getTransportProviders(t.serviceId).find(v=>v.id===t.providerId);
  const material= t.serviceId==='flete-proveedor'?(product?.supplierSlug??existing?.supplierSlug):undefined;
  if(!provider&&!quote&&!material)reject('Elegí una empresa que ofrezca este tipo de transporte.');
  if(!product&&!existing&&!t.notes?.trim())reject('Describí la carga, el peso y las dimensiones del transporte independiente.');
  const supplier=s.providers.find(v=>v.slug===material);
  const providerName=quote?.provider??supplier?.name??provider!.name;
  const linkedOrder=product?orderByLine.get(product.id):existing?.id;
  if(existing){for(const l of existing.lines)l.deliveryChoice="marketplace";existing.shippingPending=!quote;existing.updatedAt=now;}
  requests.push({...t,offerId:product?.offerId??product?.id,id:'TR-'+commandId.replace(/[^a-zA-Z0-9]/g,'').slice(-20).toUpperCase()+'-'+(requests.length+1),requestId:commandId,orderId:linkedOrder??'',project:structuredClone(project!),serviceName:service!.name,providerName,materialSupplierSlug:material,cargo:product?`${product.quantity} presentaciones · ${product.name}`:existing?existing.lines.map(l=>`${l.quantity} × ${l.name}`).join(' · '):t.notes,amount:quote?.amount??null,conditions:quote?.conditions??'',status:quote?'Cotizada':'Solicitada',own:false,contact:'',phone:'',vehicle:'',createdAt:now,updatedAt:now,history:[{at:now,action:'Solicitud registrada'}]});
 }
 for(const product of cart.products.filter(p=>p.deliveryChoice==='own')){
  const d=product.ownDelivery;const project=s.projects.find(p=>p.id===product.projectId);
  if(!projectReady(project)||!d||[d.company,d.contact,d.phone,d.date,d.time].some(v=>!v?.trim()))reject('Completá empresa, contacto, teléfono, fecha y horario del transporte propio.');
  if(!validDate(d!.date))reject('Fecha del transporte propio inválida.');
  if(d!.date<new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(now)))reject('La fecha del transporte propio no puede estar en el pasado.');
  requests.push({id:'TR-'+commandId.replace(/[^a-zA-Z0-9]/g,'').slice(-20).toUpperCase()+'-'+(requests.length+1),requestId:commandId,key:'own-'+product.id,serviceId:'own',providerId:'',offerId:product.offerId??product.id,productId:product.id,orderId:orderByLine.get(product.id)??'',projectId:project!.id,project:structuredClone(project!),pickup:product.pickup,dropoff:projectAddress(project!),floor:project!.floor,date:d!.date,time:d!.time,mode:'Transporte propio',notes:d!.notes??'',serviceName:'Transporte propio / retiro coordinado',providerName:d!.company,materialSupplierSlug:product.supplierSlug,cargo:`${product.quantity} presentaciones · ${product.name}`,amount:null,conditions:'Contratación externa. No suma cargos ni reserva de flete en Obra Clara.',status:'Confirmada',own:true,contact:d!.contact,phone:d!.phone,vehicle:d!.vehicle??'',createdAt:now,updatedAt:now,history:[{at:now,action:'Retiro con transporte propio registrado'}]});
 }
 return requests;
}
export function changeTransport(s:SharedState,type:string,p:Record<string,unknown>,now:string){
 const r=s.transportRequests?.find(v=>v.id===p.id);if(!r)reject('Solicitud de transporte no encontrada.');
 const role=String(p.role);const identity=String(p.providerId??'');
 const provider=role==='provider'&&!r!.own&&(r!.materialSupplierSlug?identity===r!.materialSupplierSlug:identity===r!.providerId);
 if(role!=='buyer'&&!provider)reject('Seleccioná la empresa responsable de este transporte.');
 if(type==='transport.quote'){
  if(!provider||!['Solicitada','Cotizada'].includes(r!.status))reject('Esta solicitud no admite una cotización.');
  const amount=Number(p.amount);if(!Number.isFinite(amount)||amount<=0||amount>1e10||Math.abs(Math.round(amount*100)-amount*100)>.00001||!String(p.conditions??'').trim())reject('Indicá un importe válido y las condiciones del viaje.');
  r!.amount=amount;r!.conditions=String(p.conditions).slice(0,1500);r!.status='Cotizada';
 }else if(type==='transport.confirm'){
  if(role!=='buyer'||r!.status!=='Cotizada'||!r!.amount)reject('Solo se puede confirmar una tarifa cotizada.');r!.status='Confirmada';
 }else if(type==='transport.status'){
  const next=String(p.status);const expected=r!.status==='Confirmada'?'En camino':r!.status==='En camino'?'Entregada':'';
  if(next!==expected||!expected||!(provider||role==='buyer'&&r!.own))reject('Transición de transporte no válida.');r!.status=next as TransportRequest['status'];
 }else if(type==='transport.cancel'){
  if(!['Solicitada','Cotizada','Confirmada'].includes(r!.status))reject('El transporte ya comenzó o está cerrado.');r!.status='Cancelada';
 }else reject('Operación de transporte no reconocida.');
 r!.updatedAt=now;r!.history.push({at:now,action:r!.status});
 // Updates logistics only. Material receipt, inventory and payment remain separate actions.
 if(r!.orderId&&['Confirmada','En camino','Entregada'].includes(r!.status)){
  const d=s.procurement??{deliveries:{},moves:[]};const old=d.deliveries[r!.orderId]??{};
  d.deliveries[r!.orderId]={...old,date:r!.date,time:/^\d{2}:\d{2}$/.test(r!.time)?r!.time:'09:00',carrier:r!.providerName,vehicle:r!.vehicle,receiver:r!.project.contactName};s.procurement=d;
 }
 const order=s.orders.find(o=>o.id===r!.orderId);
 if(order){if(r!.status==='Cancelada'&&s.procurement?.deliveries[order.id]?.carrier===r!.providerName)s.procurement.deliveries[order.id].carrier='Por coordinar · transporte cancelado';const associated=(s.transportRequests??[]).filter(t=>t.orderId===order.id&&t.status!=='Cancelada');order.transports=associated;order.shippingPending=order.lines.some(l=>{
  if(l.deliveryChoice==='supplier'&&l.shippingIncluded)return false;
  if(l.shippingIncluded===undefined&&!order.shippingPending&&!associated.length)return false;
  return !associated.some(t=>['Confirmada','En camino','Entregada'].includes(t.status)&&(!t.productId||t.offerId===l.id||t.productId===l.id));
 });order.updatedAt=now;}
}
