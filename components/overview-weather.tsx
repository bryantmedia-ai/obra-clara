'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {projectWeatherLocation,rainyDay,weatherCondition,weatherKey,type WeatherDay,type WeatherForecast,type WeatherLocation} from '../lib/weather-model';
import {useRainAlerts} from './rain-alert-store';
export type WeatherProject={id:string;name:string;city?:string;province?:string;zone?:string};
type Reading={forecast?:WeatherForecast;error?:string};
const buenosAires:WeatherLocation={city:'Buenos Aires',province:'CABA'};
const temp=(n:number|null)=>n===null?'—':Math.round(n)+'°';
const mm=(n:number|null)=>n===null?'—':n.toLocaleString('es-AR',{maximumFractionDigits:1});
const dayName=(date:string)=>new Date(date+'T12:00:00-03:00').toLocaleDateString('es-AR',{weekday:'short'}).replace('.','');
const dayDate=(date:string)=>new Date(date+'T12:00:00-03:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric'});
export function useOverviewWeather(projects:WeatherProject[]){
 const locations=useMemo(()=>{const map=new Map([[weatherKey(buenosAires),buenosAires]]);for(const p of projects){const place=projectWeatherLocation(p);if(place)map.set(weatherKey(place),place);}return [...map.values()];},[projects]);
 const key=JSON.stringify(locations);
 const [readings,setReadings]=useState<Record<string,Reading>>({});const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  const places=JSON.parse(key) as WeatherLocation[];
  void Promise.allSettled(places.map(async location=>{const id=weatherKey(location);try{const response=await fetch('/api/weather?'+new URLSearchParams(location),{signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(data.error??'No se pudo consultar el clima.');if(!controller.signal.aborted)setReadings(previous=>({...previous,[id]:{forecast:data}}));}catch(error){if(!controller.signal.aborted)setReadings(previous=>({...previous,[id]:{error:error instanceof Error?error.message:'Clima no disponible.'}}));}}));
  return()=>controller.abort();
 },[key,refresh]);
 useEffect(()=>{const timer=setInterval(()=>setRefresh(n=>n+1),15*60*1000);return()=>clearInterval(timer);},[]);
 return {readings,refresh:()=>setRefresh(n=>n+1),buenosAires:readings[weatherKey(buenosAires)]};
}
function ForecastDays({days}:{days:WeatherDay[]}){return <div className="weather-days" aria-label="Pronóstico de cinco días">{days.map((day,i)=>{const condition=weatherCondition(day.code);return <div className={rainyDay(day)?'rainy':''} key={day.date} title={`${dayDate(day.date)}: ${condition.label}, ${day.probability??'—'}% de probabilidad de lluvia, ${mm(day.rain)} mm`}><span>{i===0?'Hoy':dayName(day.date)}</span><span className="weather-day-emoji" role="img" aria-label={condition.label}>{condition.emoji}</span><strong>{temp(day.max)} <small>{temp(day.min)}</small></strong><span className="weather-day-rain">💧 {day.probability??'—'}%</span></div>;})}</div>;}
function WeatherWidget({reading,onRetry,title,city}:{reading?:Reading;onRetry:()=>void;title:string;city?:string}){
 const forecast=reading?.forecast;const condition=weatherCondition(forecast?.current.code??null,forecast?.current.isDay);
 return <aside className="weather-widget" aria-label={`Clima real de ${title}`}><div className="weather-current"><header><div className="weather-widget-identity"><strong>{title}</strong>{city&&<small>{city}</small>}</div><span>Ahora</span></header>{forecast?<><div className="weather-now"><span className="weather-current-emoji" role="img" aria-label={condition.label}>{condition.emoji}</span><strong>{temp(forecast.current.temperature)}</strong><div><span>{condition.label}</span><small>Máx. {temp(forecast.days[0].max)} · Mín. {temp(forecast.days[0].min)}</small></div></div><p className="weather-rain-today">💧 Hoy: {forecast.days[0].probability??'—'}% · {mm(forecast.days[0].rain)} mm previstos</p></>:<div className="weather-state" role="status">{reading?.error?<><span>☁️ No pudimos actualizar el clima.</span><button type="button" onClick={onRetry}>Reintentar</button></>:<span>🌤️ Consultando el clima…</span>}</div>}</div>{forecast&&<ForecastDays days={forecast.days}/>}</aside>;
}
export function BuenosAiresWeather({reading,onRetry}:{reading?:Reading;onRetry:()=>void}){return <WeatherWidget title="Buenos Aires" reading={reading} onRetry={onRetry}/>;}
export function RainAlerts({projectId,projectIds}:{projectId?:string;projectIds?:string[]|null}){
 const {report,error}=useRainAlerts();
 if(projectIds?.length===0)return null;
 if(error)return <p className="weather-check-status" role="status">No pudimos verificar las alertas de lluvia. Se reintentará automáticamente.</p>;
 if(!report)return null;
 const alerts=report.alerts.filter(a=>projectIds!==undefined?(projectIds===null||projectIds.includes(a.projectId)):(!projectId||a.projectId===projectId));const deliveryCount=alerts.reduce((n,a)=>n+a.orders.length,0);const projectCount=new Set(alerts.map(a=>a.projectId)).size;
 if(!alerts.length)return report.unavailable.length?<p className="weather-check-status" role="status">Falta información meteorológica para verificar entregas en {report.unavailable.join(', ')}.</p>:null;
 return <section className="weather-rain-alert weather-rain-summary" id="automatic-rain-alert" aria-label="Alerta de lluvia"><span className="weather-alert-emoji" aria-hidden="true">🌧️</span><div><span className="weather-alert-label">Pronóstico real × entregas guardadas</span><strong>{deliveryCount} {deliveryCount===1?'entrega coincide':'entregas coinciden'} con lluvia prevista en {projectCount} {projectCount===1?'proyecto':'proyectos'}.</strong><details className="weather-rain-detail"><summary>Ver órdenes y pronóstico <span aria-hidden="true">⌄</span></summary><ul>{alerts.flatMap(alert=>alert.orders.map(order=><li key={alert.id+order.id}><div><strong>{alert.project} · {dayDate(alert.date)}</strong><span>{order.id} · {order.supplier}</span><span>{order.items}</span><small>{order.precision==='hour'?`Descarga ${order.time}–${order.endTime} · ventana de 2 h`:'Horario a coordinar · pronóstico del día'}</small><small>💧 {order.probability??'—'}% · aprox. {mm(order.rain)} mm {order.precision==='hour'?'en esa franja':'en el día'} · Lectura {order.forecastAt.slice(11,16)}</small></div><Link href={'/compras/entregas?orden='+encodeURIComponent(order.id)}>Ver orden →</Link></li>))}</ul><p className="weather-rain-rule">Se activa con precipitación prevista y probabilidad ≥50%, o un acumulado ≥1 mm. Se excluyen órdenes canceladas, recibidas y franjas ya pasadas.</p></details><p className="weather-rain-checked">Verificado {new Date(report.checkedAt).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Argentina/Buenos_Aires'})} · Open-Meteo · revisión automática cada minuto</p>{report.unavailable.length>0&&<p className="weather-rain-checked">Pendiente de verificar: {report.unavailable.join(', ')}.</p>}</div></section>;
}
export function ProjectWeather({projects,readings,projectId,projectIds,onRetry}:{projects:WeatherProject[];readings:Record<string,Reading>;projectId?:string;projectIds?:string[]|null;onRetry:()=>void}){
 const scoped=projects.filter(p=>projectIds!==undefined?(projectIds===null||projectIds.includes(p.id)):(!projectId||p.id===projectId));
 return <section className="project-weather" id="overview-project-weather" aria-label="Clima por proyecto"><header><div><h3>Clima en tus obras</h3><p>Próximos cinco días · lluvia y condiciones para recibir materiales.</p></div><button type="button" onClick={onRetry} aria-label="Actualizar clima de los proyectos">↻ Actualizar clima</button></header><div className="project-weather-grid">{scoped.map(project=>{const location=projectWeatherLocation(project);const reading=location?readings[weatherKey(location)]:{error:'Completá la localidad y provincia en Proyectos para consultar el clima.'};return <WeatherWidget key={project.id} title={project.name} city={location?.city??'Localidad sin cargar'} reading={reading} onRetry={onRetry}/>;})}</div>{!scoped.length&&<p className="project-weather-empty">Seleccioná al menos un proyecto para ver su clima.</p>}</section>;
}
