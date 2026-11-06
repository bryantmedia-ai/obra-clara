import {constructionProduct} from '../components/catalog-departments';
import catalog from '../components/vendor-catalog-data.json';
import {projectReady,type Project} from '../components/project-data';
export type VendorReference={id:string;name:string;sourceUrl:string;image:string;imageSourceUrl?:string;imageVerifiedAt?:string;kind:string};
export type VendorCatalog={identityNote?:string;identitySource?:string;channelNote?:string;channelSource?:string;supplierId:string;supplierName:string;website:string;checkedAt:string;status:string;pages:string[];products:VendorReference[];catalogs:{name:string;url:string}[]};
export const vendorCatalogs:VendorCatalog[]=(catalog as VendorCatalog[]).map(v=>({...v,products:v.products.filter(constructionProduct)}));
export function vendorCatalog(id:string){return vendorCatalogs.find(v=>v.supplierId===id);}
export type CatalogRequest={id:string;supplierId:string;supplier:string;productId:string;product:string;sourceUrl:string;project:Project;quantity:number;unit:string;mode:'supply'|'manufacture';specifications:string;requiredDate:string;status:'Preparada'|'Cotizada'|'Archivada';createdAt:string;updatedAt:string;offer?:{unitPrice:number;validUntil:string;leadDays:number;depositPercent:number;conditions:string};history:{at:string;action:string}[]};
function fail(m:string):never{throw new Error(m);}
export function changeCatalogRequest(s:{catalogRequests?:CatalogRequest[];projects:Project[]},type:string,p:Record<string,unknown>,id:string,now:string){
 s.catalogRequests??=[];
 if(type==='catalog.request'){
  const vendor=vendorCatalog(String(p.supplierId)),product=vendor?.products.find(v=>v.id===p.productId),project=s.projects.find(v=>v.id===p.projectId);
  if(!vendor||!product||!projectReady(project))fail('Elegí un producto de catálogo y un proyecto activo con datos completos.');
  if(!Number.isInteger(p.quantity)||Number(p.quantity)<1||Number(p.quantity)>10000000)fail('Ingresá una cantidad válida.');
  if(!['supply','manufacture'].includes(String(p.mode))||typeof p.unit!=='string'||!p.unit.trim()||p.unit.length>30||typeof p.specifications!=='string'||p.specifications.trim().length<5||p.specifications.length>3000)fail('Completá unidad, modalidad y especificaciones.');
  if(typeof p.requiredDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.requiredDate)||p.requiredDate<now.slice(0,10)||!Number.isFinite(Date.parse(p.requiredDate)))fail('Elegí una fecha futura de necesidad.');
  s.catalogRequests.unshift({id:'RFQ-'+id,supplierId:vendor!.supplierId,supplier:vendor!.supplierName,productId:product!.id,product:product!.name,sourceUrl:product!.sourceUrl,project:structuredClone(project!),quantity:Number(p.quantity),unit:p.unit.trim(),mode:p.mode as 'supply'|'manufacture',specifications:p.specifications.trim(),requiredDate:p.requiredDate,status:'Preparada',createdAt:now,updatedAt:now,history:[{at:now,action:'Solicitud preparada en el espacio de trabajo; sin envío externo'}]});return;
 }
 const q=s.catalogRequests.find(v=>v.id===p.requestId);if(!q)fail('Solicitud no encontrada.');
 if(type==='catalog.respond'){
  if(q.status==='Archivada')fail('La solicitud está archivada.');
  const price=Number(p.unitPrice),lead=Number(p.leadDays),deposit=Number(p.depositPercent),until=String(p.validUntil);
  if(!Number.isFinite(price)||price<=0||price>1e12||!Number.isInteger(lead)||lead<0||lead>730||!Number.isFinite(deposit)||deposit<0||deposit>100||!Number.isFinite(Date.parse(until))||Date.parse(until)<=Date.parse(now)||typeof p.conditions!=='string'||p.conditions.trim().length<5||p.conditions.length>3000)fail('Revisá precio, vencimiento, plazo, anticipo y condiciones.');
  q.offer={unitPrice:Math.round(price*100)/100,leadDays:lead,depositPercent:deposit,validUntil:new Date(until).toISOString(),conditions:p.conditions.trim()};q.status='Cotizada';q.history.push({at:now,action:'Respuesta de prueba guardada en el espacio de trabajo'});
 }else if(type==='catalog.archive'){q.status='Archivada';q.history.push({at:now,action:'Solicitud archivada'});}else fail('Operación de catálogo no reconocida.');q.updatedAt=now;
}
