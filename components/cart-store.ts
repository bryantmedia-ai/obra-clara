"use client";
import {useEffect,useState} from "react";
import {readProjects} from "./project-store";
import {projectAddress} from "./project-data";
import {getTransportProviders} from "./transport-providers";
export type OwnDelivery={company:string;contact:string;phone:string;vehicle:string;date:string;time:string;notes:string};
export type CartProduct={priceRevision?:number;deliveryChoice?:"supplier"|"marketplace"|"own"|"arranged";ownDelivery?:OwnDelivery;offerId?:string;supplierSlug?:string;minimumOrder?:number;depositPercent?:number;projectId?:string;id:string;name:string;supplier:string;pickup:string;quantity:number;unitPrice:number;kg:number|null;shippingIncluded:boolean;image:string;unit?:string;saleLabel?:string};
export function cargoWeightLabel(p:{kg:number|null;quantity:number}){return p.kg!==null&&Number.isFinite(p.kg)&&p.kg>0?`${(p.kg*p.quantity).toLocaleString("es-AR",{maximumFractionDigits:2})} kg`:"Peso a confirmar";}
export type CartTransport={replaceIncluded?:boolean;quoteId?:string;key:string;serviceId:string;providerId?:string;productId:string;orderId:string;pickup:string;dropoff:string;projectId:string;mode:string;date:string;time:string;floor:string;notes:string};
export type CartState={products:CartProduct[];transports:CartTransport[];projectId:string};
const empty:CartState={products:[],transports:[],projectId:""};
const key="obra-clara-cart-v1";
export function readCart():CartState{if(typeof window==="undefined")return empty;try{const s=JSON.parse(localStorage.getItem(key)??"null");return s&&Array.isArray(s.products)&&Array.isArray(s.transports)?{...s,transports:[],products:s.products.map((p:CartProduct)=>({...p,deliveryChoice:"arranged",projectId:p.projectId??s.projectId??""}))}:empty;}catch{return empty;}}
export function updateCart(change:(s:CartState)=>CartState){const next=change(readCart());localStorage.setItem(key,JSON.stringify(next));window.dispatchEvent(new Event("oc-cart-updated"));}
export function normalizeQuantity(value:number,max=9999){return Math.max(1,Math.min(max,Number.isFinite(value)?Math.floor(value):1));}
export function addCartProduct(p:CartProduct,{ensure=false,maxQuantity=9999}:{ensure?:boolean;maxQuantity?:number}={}){
 let added=0;
 updateCart(s=>{
  const offerId=p.offerId??p.id;const projectId=p.projectId??s.projectId;const current=s.products.find(x=>(x.offerId??x.id)===offerId&&(x.projectId??s.projectId)===projectId);const lineId=s.products.some(x=>x.id===p.id)?offerId+"~"+crypto.randomUUID():p.id;
  const requested=normalizeQuantity(p.quantity,maxQuantity);
  if(requested<(p.minimumOrder??1))return s;
  const quantity=current?Math.max(current.quantity,Math.min(maxQuantity,ensure?Math.max(current.quantity,requested):current.quantity+requested)):requested;
  added=quantity-(current?.quantity??0);
  return {...s,products:current?s.products.map(x=>x.id===current.id?{...x,unitPrice:p.unitPrice,priceRevision:p.priceRevision,quantity}:x):[...s.products,{...p,id:lineId,offerId,quantity,projectId}]};
 });
 return added;
}
export function addCartTransport(serviceId:string,productId="",providerId=""){
 if(providerId&&!getTransportProviders(serviceId).some(p=>p.id===providerId))return;
 updateCart(s=>{const product=s.products.find(p=>p.id===productId);const projectId=product?.projectId??s.projectId;const project=readProjects().find(p=>p.id===projectId);return {...s,products:s.products.map(p=>p.id===productId?{...p,deliveryChoice:"marketplace"}:p),transports:[...s.transports.filter(t=>!productId||t.productId!==productId),{key:crypto.randomUUID(),serviceId,providerId,productId,orderId:"",pickup:product?.pickup??"",dropoff:project?projectAddress(project):"",projectId,mode:"Entrega programada",date:"",time:"",floor:project?.floor??"Planta baja",notes:""}]};});
}
export function useCart(){const[state,setState]=useState<CartState>(empty);useEffect(()=>{const load=()=>setState(readCart());load();window.addEventListener("oc-cart-updated",load);window.addEventListener("storage",load);return()=>{window.removeEventListener("oc-cart-updated",load);window.removeEventListener("storage",load);};},[]);return state;}

export function setDeliveryChoice(id:string,choice:NonNullable<CartProduct["deliveryChoice"]>){updateCart(s=>({...s,products:s.products.map(p=>p.id===id?{...p,deliveryChoice:choice}:p),transports:s.transports.filter(t=>t.productId!==id||choice==="marketplace")}));}
export function cartProductLineId(offerId:string){const s=readCart();return s.products.find(p=>(p.offerId??p.id)===offerId&&p.projectId===s.projectId)?.id??offerId;}
