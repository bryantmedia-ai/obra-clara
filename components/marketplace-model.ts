import {directPriceIssue} from "../lib/pricing-model";
import type {Product} from "./marketplace-data";
export type ProductListing={referenceId:string;offer:Product;offers:Product[]};
export function marketplaceListings(products:Product[]):ProductListing[]{const references=new Map<string,Product[]>();for(const p of products){const group=references.get(p.referenceId)??[];group.push(p);references.set(p.referenceId,group);}return [...references.entries()].map(([referenceId,offers])=>{const sorted=[...offers].sort((a,b)=>Number(!directPriceIssue(b))-Number(!directPriceIssue(a))||Number(b.stock>=(b.minimumOrder??1))-Number(a.stock>=(a.minimumOrder??1))||a.price-b.price);return {referenceId,offer:sorted[0],offers:sorted};});}
export function sellerCount(products:Product[]){return new Set(products.map(p=>p.supplier.slug)).size;}

export function deliveryRank(arrival:string){const label=arrival.toLocaleLowerCase('es');const days=label.includes('hoy')?0:label.includes('mañana')?1:Number(label.match(/(\d+)\s*d[ií]as?/)?.[1]??999);const time=label.match(/(\d{1,2}):(\d{2})/);return days*1440+(time?Number(time[1])*60+Number(time[2]):1439);}
