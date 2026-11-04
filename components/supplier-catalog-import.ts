import {catalogDepartments} from "./catalog-departments";
import type {Product} from "./marketplace-data";
export function parseSupplierCatalog(input:string,supplier:Product["supplier"]):Product[]{
 const parsed=JSON.parse(input);
 if(!Array.isArray(parsed)||!parsed.length)throw new Error("El archivo debe contener una lista de productos.");
 if(parsed.length>10000)throw new Error("Importá hasta 10.000 filas por archivo.");
 const seen=new Set<string>();
 return parsed.map((row:Record<string,unknown>,i:number)=>{
  if(!row||typeof row!=="object")throw new Error(`Fila ${i+1}: producto inválido.`);
  const sku=String(row.sku??"").trim();const name=String(row.name??"").trim();const brand=String(row.brand??"").trim();const category=String(row.category??"").trim();const image=String(row.image??"").trim();const price=Number(row.price);const stock=Number(row.stock);const unit=String(row.unit??"").trim();const format=String(row.format??"").trim();const saleLabel=String(row.saleLabel??"").trim();
  let imageValid=false;try{const url=new URL(image);imageValid=url.protocol==="https:"&&!!url.hostname&&!url.username&&!url.password;}catch{}
  if(!sku||!name||!brand||!category||!imageValid||!unit||!format||!saleLabel||!Number.isFinite(price)||price<=0||!Number.isInteger(stock)||stock<0||typeof row.shippingIncluded!=="boolean")throw new Error(`Fila ${i+1}: completá SKU, nombre, marca, categoría, presentación, formato, unidad de venta, foto HTTPS, precio positivo, stock entero y shippingIncluded verdadero/falso.`);
  if(seen.has(sku))throw new Error(`SKU duplicado: ${sku}`);seen.add(sku);
  const department=String(row.department??"");if(department&&!catalogDepartments.some(d=>d.id===department))throw new Error(`Fila ${i+1}: departamento desconocido.`);
  const kg=row.kg==null?null:Number(row.kg);const pack=Number(row.pack??saleLabel.match(/^\s*(\d+)\s/)?.[1]??1);
  if(kg!==null&&(!Number.isFinite(kg)||kg<=0))throw new Error(`Fila ${i+1}: peso inválido.`);
  if(!Number.isInteger(pack)||pack<1)throw new Error(`Fila ${i+1}: cantidad de unidades por presentación inválida.`);
  const minimumOrder=Number(row.minimumOrder??1);const deliveryDays=row.deliveryDays==null?undefined:Number(row.deliveryDays);const depositPercent=Number(row.depositPercent??0);
  if(!Number.isInteger(minimumOrder)||minimumOrder<1||minimumOrder>9999)throw new Error(`Fila ${i+1}: compra mínima inválida.`);
  if(deliveryDays!==undefined&&(!Number.isInteger(deliveryDays)||deliveryDays<0||deliveryDays>365))throw new Error(`Fila ${i+1}: plazo de preparación inválido.`);
  if(!Number.isFinite(depositPercent)||depositPercent<0||depositPercent>100)throw new Error(`Fila ${i+1}: anticipo debe estar entre 0 y 100%.`);
  const skuToken=[...sku].map(c=>c.codePointAt(0)!.toString(16)).join("-");
  const canonicalBrand=brand.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-");
  return {content:String(row.content??"").trim(),dimensions:String(row.dimensions??"").trim(),color:String(row.color??"").trim(),minimumOrder,deliveryDays,depositPercent,id:`${supplier.slug}-feed-${skuToken}`,referenceId:`feed-${canonicalBrand}-${skuToken}`,referenceCode:sku,name,brand,category,department,productType:String(row.productType??category),model:String(row.model??sku),image,imageAlt:name,supplier,price,stock,stockUnit:String(row.stockUnit??"presentaciones"),unit,format,saleLabel,pack,kg,use:String(row.use??""),shippingIncluded:row.shippingIncluded};
 });
}
