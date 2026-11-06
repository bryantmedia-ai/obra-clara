export const catalogDepartments=[
 {id:"construccion",name:"Construcción",categories:["Corralón"],image:"/products/catalog/corralon-01.jpg",children:["Cementos y morteros","Arenas y áridos","Yesos y cales","Ladrillos y bloques","Hierro y acero","Construcción en seco","Maderas y tableros","Techos y aislaciones","Químicos de construcción"]},
 {id:"pisos",name:"Pisos y revestimientos",categories:["Pisos y revestimientos"],image:"/departments/pisos.jpg",children:["Porcelanatos","Cerámicos","Pisos flotantes","Pisos vinílicos","Revestimientos de pared","Adhesivos y pastinas","Zócalos"]},
 {id:"herramientas",name:"Herramientas y maquinarias",categories:["Herramientas","Grupos electrógenos"],image:"/products/catalog/herramientas-01.jpg",children:["Taladros y atornilladores","Rotomartillos y demoledores","Amoladoras","Sierras","Herramientas manuales","Soldadoras","Grupos electrógenos","Compresores","Hidrolavadoras"]},
 {id:"electricidad",name:"Plomería y electricidad",categories:["Electricidad","Cables y conductores","Sanitarios"],image:"/products/catalog/electricidad-01.jpg",children:["Cables y conductores","Tableros y protecciones","Interruptores y tomacorrientes","Canalización","Caños y accesorios","Bombas de agua","Termotanques","Conexiones de gas"]},
 {id:"ferreteria",name:"Ferretería y seguridad",categories:["Ferretería","Seguridad e indumentaria"],image:"/products/catalog/ferreteria-01.jpg",children:["Fijaciones y anclajes","Tornillos y bulones","Cerraduras y herrajes","Adhesivos y selladores","Seguridad e indumentaria","Protección en altura","Señalización"]},
 {id:"pinturas",name:"Pinturas",categories:["Pinturas"],image:"/products/catalog/pinturas-01.jpg",children:["Látex interior","Látex exterior","Esmaltes","Impermeabilizantes","Barnices","Revestimientos texturados","Pinceles y rodillos"]},
 {id:"bano",name:"Baño",categories:["Baño"],image:"/departments/bano.jpg",children:["Inodoros y bidets","Lavatorios y bachas","Griferías","Mamparas","Duchas y bañeras","Accesorios de baño"]},
 {id:"aberturas",name:"Aberturas",categories:["Aberturas"],image:"/departments/aberturas.jpg",children:["Puertas de entrada","Puertas interiores","Ventanas de aluminio","Ventanas de PVC","Portones","Rejas y mosquiteros","Accesorios de aberturas"]},
 {id:"iluminacion",name:"Iluminación",categories:["Iluminación"],image:"/products/catalog/electricidad-16.jpg",children:["Plafones LED","Lámparas y tubos LED","Reflectores","Iluminación exterior","Iluminación de emergencia"]},
] as const;
export function productDepartment(product:{category?:string;name:string;productType?:string;department?:string}){if(product.department){const explicit=catalogDepartments.find(d=>d.id===product.department);if(explicit)return explicit;}
 const text=`${product.name} ${product.productType??""}`.toLowerCase();
 if(/reflector|proyector led|luz emergencia|plaf[oó]n/.test(text))return catalogDepartments.find(d=>d.id==="iluminacion");
 if(/aspiradora/.test(text))return catalogDepartments.find(d=>d.id==="herramientas");
 const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const category=normalize(product.category??"Corralón");
 return catalogDepartments.find(d=>[...d.categories,d.name].some(c=>normalize(c)===category))??(category==="materiales de construccion"||category==="construccion y reparacion"?catalogDepartments[0]:undefined);}
export function departmentMatches(product:{category?:string;name:string;productType?:string;department?:string},id?:string){return !id||productDepartment(product)?.id===id;}
