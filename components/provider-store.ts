"use client";
import {queueShared} from "./shared-demo";
import {useEffect,useState} from "react";
import {cementSuppliers} from "./marketplace-data";
export type Provider=typeof cementSuppliers[number]&{email?:string;phone?:string;cuit?:string;registeredAt?:string};
export const businessTypes=["Fabricante","Productor","Distribuidor","Mayorista","Corralón","Comerciante especializado"];
export const companySizes=["Microempresa / emprendimiento","Pequeña empresa","Mediana empresa","Gran empresa"];
const key="obra-clara-providers-v1";
const activeKey="obra-clara-active-provider-v1";
export function readProviders():Provider[]{if(typeof window==="undefined")return cementSuppliers;try{const data=JSON.parse(localStorage.getItem(key)??"[]");const merged=new Map<string,Provider>(cementSuppliers.map(p=>[p.slug,p]));if(Array.isArray(data))for(const p of data)if(p?.slug&&p?.name)merged.set(p.slug,p);return [...merged.values()];}catch{return cementSuppliers;}}
export function registerProvider(provider:Provider){
 if(!provider.name.trim()||!provider.address.trim()||!businessTypes.includes(provider.businessType)||!companySizes.includes(provider.companySize))throw new Error("Completá nombre, dirección, actividad y tamaño de la empresa.");
 const providers=readProviders();const next=new Map(providers.map(p=>[p.slug,p]));next.set(provider.slug,provider);localStorage.setItem(key,JSON.stringify([...next.values()]));queueShared("provider",provider);setActiveProvider(provider.slug);window.dispatchEvent(new Event("oc-providers-updated"));
}
export function setActiveProvider(slug:string){if(slug&&!readProviders().some(p=>p.slug===slug))return;localStorage.setItem(activeKey,slug);window.dispatchEvent(new Event("oc-provider-account-updated"));}
export function readActiveProvider(){return typeof window==="undefined"?"":localStorage.getItem(activeKey)??"";}
export function useProviders(){const [providers,setProviders]=useState<Provider[]>(cementSuppliers);useEffect(()=>{const refresh=()=>setProviders(readProviders());refresh();window.addEventListener("oc-providers-updated",refresh);window.addEventListener("storage",refresh);return()=>{window.removeEventListener("oc-providers-updated",refresh);window.removeEventListener("storage",refresh);};},[]);return providers;}
export function useActiveProvider(){const [slug,setSlug]=useState("");useEffect(()=>{const refresh=()=>setSlug(readActiveProvider());refresh();window.addEventListener("oc-provider-account-updated",refresh);window.addEventListener("storage",refresh);return()=>{window.removeEventListener("oc-provider-account-updated",refresh);window.removeEventListener("storage",refresh);};},[]);return slug;}
