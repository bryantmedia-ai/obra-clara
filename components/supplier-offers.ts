"use client";
import {queueShared} from "./shared-demo";
import {useProviders} from "./provider-store";
import {useEffect,useState} from "react";
import {completeMarketplaceCatalog,type Product} from "./marketplace-data";
const key="obra-clara-supplier-offers-v1";
export function readSupplierOffers():Product[]{if(typeof window==="undefined")return [];try{const value=JSON.parse(localStorage.getItem(key)??"[]");return Array.isArray(value)?value:[];}catch{return [];}}
export function publishSupplierOffers(offers:Product[]){const current=readSupplierOffers();const next=new Map(current.map(p=>[p.id,p]));for(const offer of offers)next.set(offer.id,offer);localStorage.setItem(key,JSON.stringify([...next.values()]));window.dispatchEvent(new Event("oc-offers-updated"));queueShared("offers",offers.map(o=>({...o,expectedStock:current.find(p=>p.id===o.id)?.stock??completeMarketplaceCatalog.find(p=>p.id===o.id)?.stock})));}
export function applySupplierOffers(base:Product[],offers:Product[]){const all=new Map(base.map(p=>[p.id,p]));for(const offer of offers)all.set(offer.id,offer);return [...all.values()];}
export function useSupplierOffers(){const providers=useProviders();const [offers,setOffers]=useState<Product[]>([]);useEffect(()=>{const refresh=()=>setOffers(readSupplierOffers());refresh();window.addEventListener("oc-offers-updated",refresh);window.addEventListener("storage",refresh);return()=>{window.removeEventListener("oc-offers-updated",refresh);window.removeEventListener("storage",refresh);};},[]);return applySupplierOffers(completeMarketplaceCatalog,offers).map(p=>({...p,supplier:providers.find(s=>s.slug===p.supplier.slug)??p.supplier}));}
