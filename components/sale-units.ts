export function saleUnitCode(saleLabel="",presentation=""){
 const label=`${saleLabel} ${presentation}`.toLocaleLowerCase("es");
 if(/\bpaquetes?\b/.test(label))return "P";
 if(/\bbolsas?\b/.test(label))return "B";
 return "U";
}
export function saleUnits(count:number,saleLabel="",presentation=""){return `${count} ${saleUnitCode(saleLabel,presentation)}`;}
export function cartSaleUnits(quantity:number,saleLabel="",presentation=""){
 const pack=Number(saleLabel.match(/^\s*(\d+)\s/)?.[1]??1);
 return saleUnits(quantity*pack,saleLabel,presentation);
}
export function shortSaleLabel(label:string){return label.replace(/\bbolsas?\b/gi,"B").replace(/\bpaquetes?\b/gi,"P").replace(/\bunidad(?:es)?\b/gi,"U");}
