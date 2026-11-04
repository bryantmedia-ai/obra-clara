export const priceMoney=(n:number)=>`${n.toLocaleString('es-AR',{maximumFractionDigits:2})} ARGt`;
export function priceDate(value?:string){return value?new Date(value).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'short'}):'Sin confirmar';}
export function expiryInput(value?:string,days=7){const d=new Date(value??Date.now()+days*86400000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
