import type {CartState,CartTransport} from "./cart-store";
import {Project,projectReady,projectAddress,validFreightQuote} from "./project-data";
import {getTransportProviders} from "./transport-providers";
export function transportQuote(cart:CartState,t:CartTransport,projects:Project[]){
 const project=projects.find(p=>p.id===t.projectId);const product=cart.products.find(p=>p.id===t.productId);
 if(!project||!product||product.projectId!==project.id||t.pickup!==product.pickup||t.dropoff!==projectAddress(project)||t.floor!==project.floor||!!t.notes.trim())return;
 const kg=product.kg===null?null:product.kg*product.quantity;
 const provider=getTransportProviders(t.serviceId).find(p=>p.id===t.providerId);
 return project.quotes.find(q=>q.service===t.serviceId&&q.productId===(product.offerId??product.id)&&q.maxQuantity>=product.quantity&&(t.quoteId?q.id===t.quoteId:!!provider&&q.provider===provider.name)&&validFreightQuote(project,q,t.pickup,kg));
}
export function cartProjectIssues(cart:CartState,projects:Project[]){
 const issues:string[]=[];
 for(const p of cart.products){if(p.deliveryChoice==="own"&&(!p.ownDelivery||[p.ownDelivery.company,p.ownDelivery.contact,p.ownDelivery.phone,p.ownDelivery.date,p.ownDelivery.time].some(v=>!v?.trim())))issues.push(`${p.name}: completá empresa, contacto, teléfono, fecha y horario del transporte propio.`);if(p.quantity<(p.minimumOrder??1))issues.push(`${p.name}: respetá la compra mínima de ${p.minimumOrder} presentaciones.`);if(!projectReady(projects.find(project=>project.id===p.projectId)))issues.push(`Asigná ${p.name} a un proyecto activo con sus datos completos.`);}
 for(const t of cart.transports){const project=projects.find(p=>p.id===t.projectId);if(!project||!projectReady(project))issues.push("Cada transporte debe tener un proyecto activo con sus datos completos.");else if(t.dropoff!==projectAddress(project))issues.push("Actualizá el destino del transporte con la dirección guardada del proyecto.");const product=cart.products.find(p=>p.id===t.productId);if(product&&(product.projectId!==t.projectId||product.pickup!==t.pickup))issues.push("El transporte debe coincidir con el proyecto y el origen de su producto.");}
 return [...new Set(issues)];
}
