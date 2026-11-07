import {isCalendarDate} from './calendar-date';
import {projectAddress,type Project} from '../components/project-data';

export type OrderDelivery={address:string;contactName:string;contactPhone:string;requestedDate:string;timeWindow:string;notes:string};
export function defaultOrderDelivery(project:Project):OrderDelivery{return {address:projectAddress(project),contactName:project.contactName,contactPhone:project.contactPhone,requestedDate:'',timeWindow:'A coordinar con el proveedor',notes:''};}
export function validateOrderDelivery(value:unknown,today:string):OrderDelivery{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Completá los datos de entrega.');
 const v=value as Record<string,unknown>;const result={} as OrderDelivery;
 for(const [key,max] of [['address',400],['contactName',150],['contactPhone',80],['requestedDate',10],['timeWindow',120],['notes',1000]] as const){if(typeof v[key]!=='string'||v[key].length>max)throw new Error('Revisá los datos de entrega.');result[key]=v[key].trim();}
 if(result.address.length<5||result.contactName.length<2||result.contactPhone.length<6||!result.timeWindow)throw new Error('Completá dirección, contacto y franja de entrega.');
 if(result.requestedDate&&(!isCalendarDate(result.requestedDate)||result.requestedDate<today))throw new Error('Elegí una fecha de entrega válida, desde hoy.');
 return result;
}
// Stable demo distribution; a supplier can change its offer after initialization.
export function demoShippingIncluded(id:string){return [...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0)%5!==0;}
