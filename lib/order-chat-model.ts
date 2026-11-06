import {validateOrderAttachment,type OrderAttachment} from "./order-attachments";
import type {SharedOrder} from './demo-model';
export type OrderChatRole='buyer'|'provider';
export type OrderMessage={id:string;role:OrderChatRole;text:string;at:string;author:string;attachments?:OrderAttachment[]};
export type OrderThread={orderId:string;supplierSlug:string;messages:OrderMessage[];read:{buyer:number;provider:number};updatedAt:string};
export function unreadOrderMessages(thread:OrderThread|undefined,role:OrderChatRole){return thread?.messages.filter((m,index)=>m.role!==role&&index>=(thread.read[role]??0)).length??0;}
export function changeOrderChat(threads:OrderThread[],orders:SharedOrder[],type:string,p:Record<string,unknown>,id:string,now:string){
 const order=orders.find(o=>o.id===p.orderId);
 if(!order)throw new Error('Seleccioná una orden existente para conversar.');
 if(p.role!=='buyer'&&p.role!=='provider')throw new Error('Perfil de mensajería inválido.');
 const role=p.role;
 if(role==='provider'&&p.supplierSlug!==order.supplierSlug)throw new Error('Esta orden corresponde a otro proveedor.');
 let thread=threads.find(t=>t.orderId===order.id);
 if(type==='orderchat.send'){
  if(p.attachments!==undefined&&(!Array.isArray(p.attachments)||p.attachments.length>6))throw new Error('Podés adjuntar hasta 6 archivos por mensaje.');
  const attachments=(p.attachments as unknown[]|undefined??[]).map(file=>validateOrderAttachment(file,order.id));
  if(new Set(attachments.map(file=>file.id)).size!==attachments.length)throw new Error('Hay archivos adjuntos repetidos.');
  if(typeof p.text!=='string'||(!p.text.trim()&&!attachments.length)||p.text.trim().length>4000)throw new Error('Escribí un mensaje de hasta 4.000 caracteres.');
  if(thread?.messages.some(m=>m.id===id))return false;
  if((thread?.messages.length??0)>=300)throw new Error('La conversación alcanzó el límite de 300 mensajes. Se conserva su historial.');
  if(!thread){thread={orderId:order.id,supplierSlug:order.supplierSlug,messages:[],read:{buyer:0,provider:0},updatedAt:now};threads.push(thread);}
  thread.messages.push({id,role,text:p.text.trim(),...(attachments.length?{attachments}:{}),at:now,author:role==='provider'?order.supplier:'Administración · Compras'});
  thread.read[role]=thread.messages.length;thread.updatedAt=now;return true;
 }
 if(type==='orderchat.read'){
  if(!thread)return false;
  const through=Number(p.through);
  if(!Number.isInteger(through)||through<0||through>thread.messages.length)throw new Error('Referencia de lectura inválida.');
  if(through<=thread.read[role])return false;
  thread.read[role]=through;return true;
 }
 throw new Error('Acción de mensajería desconocida.');
}
