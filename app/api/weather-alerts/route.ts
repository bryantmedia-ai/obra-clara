import {getWeatherForecast} from '../../../lib/weather-service';
import {scheduledDeliveries,buildRainReport} from '../../../lib/rain-alert-model';
import {weatherKey,type WeatherForecast} from '../../../lib/weather-model';
import type {SharedState} from '../../../lib/demo-model';
export async function GET(request:Request){
 const authorization=request.headers.get('authorization');const headers={'Cache-Control':'private, no-store'};
 if(!/^Bearer [a-f0-9]{64}$/.test(authorization??''))return Response.json({error:'Sesión requerida.'},{status:401,headers});
 try{
  const response=await fetch('https://obra-clara-api.obra-clara.workers.dev/api/demo',{headers:{Authorization:authorization!},cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)return Response.json({error:'No pudimos consultar tus órdenes guardadas.'},{status:response.status,headers});
  const state=await response.json() as SharedState;const now=new Date();const {deliveries}=scheduledDeliveries(state,now);
  const locations=new Map(deliveries.map(d=>[weatherKey(d.location),d.location]));const forecasts:Record<string,WeatherForecast>={};
  await Promise.allSettled([...locations.entries()].map(async([key,location])=>{forecasts[key]=await getWeatherForecast(location.city,location.province);}));
  return Response.json(buildRainReport(state,forecasts,now),{headers});
 }catch{return Response.json({error:'No pudimos verificar lluvia y entregas. Reintentaremos automáticamente.'},{status:503,headers});}
}
