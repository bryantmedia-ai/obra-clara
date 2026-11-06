import type {SharedState} from './demo-model';
import {projectWeatherLocation,weatherKey,type WeatherForecast,type WeatherLocation} from './weather-model';
export type RainOrder={id:string;supplierSlug:string;supplier:string;time:string;endTime:string;items:string;remaining:number;probability:number|null;rain:number;precision:'hour'|'day';forecastAt:string};
export type RainAlert={id:string;projectId:string;project:string;city:string;date:string;orders:RainOrder[]};
export type RainReport={checkedAt:string;revision:number;alerts:RainAlert[];unavailable:string[];evaluatedOrders:number;unscheduledOrders:number};
export type ScheduledDelivery={order:SharedState['orders'][number];project:SharedState['projects'][number];location:WeatherLocation;date:string;time:string};
const localStamp=(date:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(date).replace(' ','T');
const rainRisk=(rain:number|null,probability:number|null)=>rain!==null&&rain>0&&((probability??0)>=50||rain>=1);
export function scheduledDeliveries(state:SharedState,now=new Date()){
 const today=localStamp(now).slice(0,10);const deliveries:ScheduledDelivery[]=[];let unscheduledOrders=0;
 for(const order of state.orders){
  if(!['Aceptada','En preparación','Despachada'].includes(order.status)||order.lines.every(l=>l.received>=l.quantity))continue;
  const project=state.projects.find(p=>p.id===order.project.id);if(!project||project.status==='Finalizado')continue;
  const location=projectWeatherLocation(project);const schedule=state.procurement?.deliveries[order.id];
  const date=schedule?.date??order.transports.find(t=>t.date)?.date??'';const time=schedule?.time??order.transports.find(t=>t.time)?.time??'';
  if(!location||!/^\d{4}-\d{2}-\d{2}$/.test(date)){unscheduledOrders++;continue;}
  if(date<today)continue;
  deliveries.push({order,project,location,date,time:/^([01]\d|2[0-3]):[0-5]\d$/.test(time)?time:''});
 }
 return {deliveries,unscheduledOrders};
}
export function buildRainReport(state:SharedState,forecasts:Record<string,WeatherForecast>,now=new Date()):RainReport{
 const {deliveries,unscheduledOrders}=scheduledDeliveries(state,now);const groups=new Map<string,RainAlert>();const unavailable=new Set<string>();let evaluatedOrders=0;
 for(const delivery of deliveries){const {order,project,location,date,time}=delivery;const forecast=forecasts[weatherKey(location)];if(!forecast){unavailable.add(location.city);continue;}
  const day=forecast.days.find(d=>d.date===date);if(!day)continue;
  let rain:number|null=null,probability:number|null=null,endTime='',precision:RainOrder['precision']='day';
  if(time){
   const start=Date.parse(date+'T'+time+':00-03:00'),end=start+2*3600000;if(end<=now.getTime())continue;
   const futureStart=Math.max(start,now.getTime());
   // Open-Meteo precipitation is accumulated over the preceding hour.
   const hours=(forecast.hours??[]).map(h=>({...h,end:Date.parse(h.time+':00-03:00')})).filter(h=>h.end>futureStart&&h.end-3600000<end);
   const coverage=hours.reduce((n,h)=>n+Math.max(0,Math.min(end,h.end)-Math.max(futureStart,h.end-3600000)),0);
   if(!hours.length||coverage<end-futureStart||hours.some(h=>h.rain===null||h.probability===null)){unavailable.add(location.city);continue;}
   rain=Math.round(hours.reduce((n,h)=>n+h.rain!*Math.max(0,Math.min(end,h.end)-Math.max(futureStart,h.end-3600000))/3600000,0)*100)/100;
   probability=Math.max(...hours.map(h=>h.probability!));endTime=localStamp(new Date(end)).slice(11,16);precision='hour';
  }else{rain=day.rain;probability=day.probability;}
  evaluatedOrders++;if(!rainRisk(rain,probability))continue;
  const id='rain:'+project.id+':'+date;let group=groups.get(id);if(!group){group={id,projectId:project.id,project:project.name,city:location.city,date,orders:[]};groups.set(id,group);}
  group.orders.push({id:order.id,supplierSlug:order.supplierSlug,supplier:order.supplier,time,endTime,items:order.lines.filter(l=>l.received<l.quantity).map(l=>l.name).join(' · '),remaining:order.lines.reduce((n,l)=>n+Math.max(0,l.quantity-l.received),0),probability,rain:rain!,precision,forecastAt:forecast.updatedAt});
 }
 return {checkedAt:now.toISOString(),revision:state.revision,alerts:[...groups.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.project.localeCompare(b.project)),unavailable:[...unavailable],evaluatedOrders,unscheduledOrders};
}
export function supplierRainAlerts(alerts:RainAlert[],supplierSlug?:string){return supplierSlug?alerts.map(a=>({...a,orders:a.orders.filter(o=>o.supplierSlug===supplierSlug)})).filter(a=>a.orders.length):alerts;}
