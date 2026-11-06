'use client';
import {useEffect,useState} from 'react';
import {useShared,workspaceToken} from './shared-demo';
import type {RainReport} from '../lib/rain-alert-model';
type Result={report?:RainReport;error?:string};
const requests=new Map<string,Promise<Result>>();
const cached=new Map<string,{at:number;result:Result}>();
async function checkRain(token:string,revision:number):Promise<Result>{
 const key=token+':'+revision,previous=cached.get(key);if(previous&&Date.now()-previous.at<5000)return previous.result;
 const existing=requests.get(key);if(existing)return existing;
 const task=(async()=>{try{const response=await fetch('/api/weather-alerts',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(30000)});const data=await response.json();if(!response.ok)throw Error(data.error??'No se pudieron verificar las alertas.');const result={report:data as RainReport};cached.clear();cached.set(key,{at:Date.now(),result});return result;}catch(error){return {error:error instanceof Error?error.message:'No se pudieron verificar las alertas.'};}finally{requests.delete(key);}})();requests.set(key,task);return task;
}
export function useRainAlerts():Result{
 const {ready,state}=useShared();const revision=state?.revision??-1;const [result,setResult]=useState<Result>({});
 useEffect(()=>{if(!ready)return;let active=true;const token=workspaceToken();const refresh=async()=>{const next=await checkRain(token,revision);if(active)setResult(next);};void refresh();const timer=setInterval(()=>void refresh(),60000);const focus=()=>{if(!document.hidden)void refresh();};window.addEventListener('focus',focus);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',focus);};},[ready,revision]);
 return result.report&&result.report.revision<revision?{}:result;
}
