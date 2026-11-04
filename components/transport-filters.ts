import {transportServices} from "./transport-data";
export type TransportFilters={query:string;selectedIds:string[];favoritesOnly:boolean;favoriteKeys:string[]};
const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es");
export function filterTransportServices({query,selectedIds,favoritesOnly,favoriteKeys}:TransportFilters){
 const selected=new Set(selectedIds),saved=new Set(favoriteKeys);
 const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
 return transportServices.filter(service=>(!selected.size||selected.has(service.id))&&(!favoritesOnly||saved.has(`transport:${service.id}`))&&terms.every(term=>normalize(`${service.name} ${service.cargo} ${service.group}`).includes(term)));
}
