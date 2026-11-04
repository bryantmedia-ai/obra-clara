import research from "./transport-providers.json";

export type PublishedRate={amount:number;currency:string;unit:string;conditions:string;source?:string};
export type TransportProvider={id:string;name:string;url:string;zone:string;services:string;confirmed:string[];inquiry:string[];hours:string;rates:Record<string,PublishedRate>;registration:string;researchedAt:string};
export const transportProviders=research as TransportProvider[];
export function getTransportProviders(serviceId:string){return transportProviders.filter(p=>p.confirmed.includes(serviceId)||p.inquiry.includes(serviceId)).map(p=>({...p,configurationConfirmed:p.confirmed.includes(serviceId),rate:p.rates[serviceId]??null})).sort((a,b)=>Number(b.configurationConfirmed)-Number(a.configurationConfirmed)||Number(Boolean(b.rate))-Number(Boolean(a.rate))||a.name.localeCompare(b.name,"es"));}
export function formatTransportRate(rate:PublishedRate|null|undefined){return rate?`${rate.currency} ${rate.amount.toLocaleString("es-AR",{maximumFractionDigits:2})} / ${rate.unit}`:"A cotizar";}
