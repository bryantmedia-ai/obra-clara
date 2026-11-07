import type {Product} from '../components/marketplace-data';
import type {SharedState} from './demo-model';

export type SaleMode='direct'|'quote';
export type PriceTerms={saleMode?:SaleMode;priceValidUntil?:string;priceConfirmedAt?:string;priceChangedAt?:string;priceRevision?:number};
export type PriceEvent={id:string;at:string;supplierSlug:string;action:string;count:number;validUntil:string;changes:{id:string;before:number;after:number}[]};
export const saleMode=(p:PriceTerms)=>p.saleMode??'direct';
export function priceExpired(p:PriceTerms,now=Date.now()){return !!p.priceValidUntil&&(!Number.isFinite(Date.parse(p.priceValidUntil))||Date.parse(p.priceValidUntil)<=now);}
export function directPriceIssue(p:Product,now=Date.now()){return saleMode(p)==='quote'?'Este producto requiere una cotización aceptada.':priceExpired(p,now)?'El precio venció. Solicitá una cotización o esperá la confirmación del proveedor.':!Number.isFinite(p.price)||p.price<=0?'El precio debe ser confirmado por el proveedor.':'';}
export function futureExpiry(value:unknown,now:string){if(typeof value!=='string'||!Number.isFinite(Date.parse(value))||Date.parse(value)<=Date.parse(now)||Date.parse(value)>Date.parse(now)+366*86400000)throw new Error('Elegí un vencimiento futuro dentro de los próximos 366 días.');return new Date(value).toISOString();}
export function validatePriceTerms(o:Product,now:string){if(o.saleMode!==undefined&&!['direct','quote'].includes(o.saleMode))throw new Error('Modalidad de compra inválida.');if(!o.priceValidUntil)throw new Error('Definí hasta cuándo está vigente el precio.');futureExpiry(o.priceValidUntil,now);}
export function applyPriceUpdate(s:SharedState,p:Record<string,unknown>,products:Product[],id:string,now:string){
 const supplier=s.providers.find(v=>v.slug===p.supplierSlug);if(!supplier)throw new Error('Proveedor no encontrado.');
 const rows=p.rows as {id:string;expectedRevision:number;expectedPrice:number}[];
 if(!Array.isArray(rows)||!rows.length||rows.length>500||new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('Seleccioná entre 1 y 500 productos distintos.');
 if(!['confirm','percent','set'].includes(String(p.action)))throw new Error('Operación de precio inválida.');
 if(p.saleMode!==undefined&&!['direct','quote'].includes(String(p.saleMode)))throw new Error('Modalidad de compra inválida.');
 const validUntil=futureExpiry(p.validUntil,now);const value=Number(p.value);
 if(p.action!=='confirm'&&(!Number.isFinite(value)||p.action==='percent'&&(value<=-100||value>10000)||p.action==='set'&&(value<=0||value>1e12)))throw new Error('Ingresá un importe o porcentaje válido.');
 const changes:PriceEvent['changes']=[];
 for(const row of rows){
  const old=products.find(v=>v.id===row.id);if(!old||old.supplier.slug!==supplier.slug)throw new Error('Todos los productos deben pertenecer al proveedor seleccionado.');
  if(row.expectedRevision!==(old.priceRevision??0)||row.expectedPrice!==old.price)throw new Error('Los precios cambiaron en otra sesión. Actualizá la página y revisá la selección.');
  const price=p.action==='confirm'?old.price:Math.round((p.action==='percent'?old.price*(1+value/100):value)*100)/100;
  const mode=(p.saleMode??saleMode(old)) as SaleMode;
  if(!Number.isFinite(price)||price<0||price>1e12||mode==='direct'&&price<=0)throw new Error('Cada producto de compra directa necesita un precio positivo.');
  const updated:Product={...old,price,saleMode:mode,priceValidUntil:validUntil,priceConfirmedAt:now,priceChangedAt:price!==old.price?now:old.priceChangedAt,priceRevision:(old.priceRevision??0)+1};
  s.offers=[...s.offers.filter(v=>v.id!==old.id),updated];changes.push({id:old.id,before:old.price,after:price});
 }
 s.priceHistory=[{id,at:now,supplierSlug:supplier.slug,action:String(p.action),count:rows.length,validUntil,changes},...(s.priceHistory??[])].slice(0,200);
}
