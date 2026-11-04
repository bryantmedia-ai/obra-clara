export function productQuantityState(value:string,stock:number){
 const quantity=/^\d{1,4}$/.test(value)?Number(value):0;
 const valid=Number.isInteger(quantity)&&quantity>=1&&quantity<=9999&&quantity<=stock;
 return {quantity,valid,message:quantity>stock?`Stock máximo: ${stock} U`:!valid?"Ingresá una cantidad entre 1 y 9999.":""};
}
export function quantityDraft(value:string){return /^\d{0,4}$/.test(value);}
