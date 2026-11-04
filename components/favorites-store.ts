"use client";
import {useSyncExternalStore} from "react";
const key="obra-clara-favorites-v1";
const empty:string[]=[];
let cachedRaw:string|null=null;
let cached:string[]=empty;
const listeners=new Set<()=>void>();
export function readFavorites():string[]{
 if(typeof window==="undefined")return empty;
 try{
  const raw=localStorage.getItem(key)??"[]";
  if(raw!==cachedRaw){
   let parsed:unknown;try{parsed=JSON.parse(raw);}catch{parsed=[];}
   cached=Array.isArray(parsed)?[...new Set(parsed.filter((id):id is string=>typeof id==="string"))]:[];
   cachedRaw=raw;
  }
 }catch{/* Keep the current session usable if browser storage is unavailable. */}
 return cached;
}
function notify(){for(const listener of listeners)listener();}
function onStorage(event:StorageEvent){if(event.key===key||event.key===null)notify();}
function subscribe(listener:()=>void){
 if(!listeners.size)window.addEventListener("storage",onStorage);
 listeners.add(listener);
 return()=>{listeners.delete(listener);if(!listeners.size)window.removeEventListener("storage",onStorage);};
}
export function toggleFavorite(id:string){
 const current=readFavorites();
 const next=current.includes(id)?current.filter(item=>item!==id):[...current,id];
 cachedRaw=JSON.stringify(next);cached=next;
 try{localStorage.setItem(key,cachedRaw);}catch{/* Session state remains available. */}
 notify();
}
export function useFavorites(){return useSyncExternalStore(subscribe,readFavorites,()=>empty);}
