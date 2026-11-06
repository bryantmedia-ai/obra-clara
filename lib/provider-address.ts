import overrides from '../components/provider-address-overrides.json';
type AddressedProvider={id:string;name:string;address:string;locality:string;province:string;website?:string;addressSource?:string;addressCheckedAt?:string};
type AddressOverride={address:string;locality:string;province:string;addressSource:string;addressCheckedAt:string;website?:string;tags?:string[]};
const verified=overrides as Record<string,AddressOverride>;
export function concreteProviderAddress(p:AddressedProvider){const a=p.address.trim();if(a.length<5||/^\d+$/.test(a)||/validar|cobertura|venta\s*(web|online)|por confirmar|sede|^argentina$|^parque industrial$/i.test(a)||a.toLocaleLowerCase()===p.name.toLocaleLowerCase()||/^(calle|ruta(?: nacional| provincial)?)\s*\d+$/i.test(a))return false;return /\d/.test(a)||/\s+[ye]\s+|\besq(?:uina)?\b|\bentre\b|\bs\s*\/?\s*n\b/i.test(a);}
export function withProviderAddress<T extends AddressedProvider>(p:T):T{return {...p,...verified[p.id]};}
export function providerStreetLabel(p:AddressedProvider){return p.address.trim();}
