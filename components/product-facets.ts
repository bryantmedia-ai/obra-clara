import type {Product} from "./marketplace-data";
const measurementNumber=(value:string)=>Number(/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(value)?value.replace(/\./g,"").replace(",","."):value.replace(",","."));
const numberLabel=(value:number)=>value.toLocaleString("es-AR",{maximumFractionDigits:4});
export function productContent(product:Pick<Product,"content"|"kg"|"format"|"unit">){
 if(product.content?.trim())return product.content.trim();
 const text=`${product.format??""} ${product.unit}`;
 const matches=text.matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|dm3|dm³|m3|m³|m2|m²|litros?|lts?|l|metros?|mts?|m)(?![a-z0-9])/gi);
 for(const match of matches){if(/[x×]\s*$/.test(text.slice(0,match.index)))continue;const units=match[2].toLowerCase();const unit=/^(litro|lt|l$)/.test(units)?"L":/^(metro|mt|m$)/.test(units)?"m":units.replace("3","³").replace("2","²");return `${numberLabel(measurementNumber(match[1]))} ${unit}`;}
 return "";
}
export function productDimensions(product:Pick<Product,"dimensions"|"format"|"name"|"model">){
 if(product.dimensions?.trim())return product.dimensions.trim();
 const text=`${product.format??""} ${product.name} ${product.model}`;
 const match=text.match(/(\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?(?:\s*[x×]\s*\d+(?:[.,]\d+)?)?)\s*(mm|cm|m|mts?|metros?)(?![a-z²³0-9])/i);
 if(match)return `${match[1].split(/[x×]/).map(v=>numberLabel(Number(v.trim().replace(",",".")))).join(" × ")} ${/^m(?:t|etro)/i.test(match[2])?"m":match[2].toLowerCase()}`;
 const diameter=text.match(/[Øø]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm)/);return diameter?`Ø ${numberLabel(Number(diameter[1].replace(",",".")))} ${diameter[2]}`:"";
}
