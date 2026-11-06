import {localWeatherPlaces,normalizePlace,type WeatherForecast} from './weather-model';
type Place={name:string;lat:number;lon:number};
async function getJSON(url:string,revalidate=900){
 const response=await fetch(url,{next:{revalidate},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('Weather provider unavailable');
 return response.json();
}
async function locate(city:string,province:string):Promise<Place|null>{
 const local=localWeatherPlaces[normalizePlace(city)];
 if(local&&['caba','buenos aires','capital federal','ciudad autonoma de buenos aires'].includes(normalizePlace(province)))return local;
 const url=new URL('https://geocoding-api.open-meteo.com/v1/search');
 url.search=new URLSearchParams({name:city,count:'10',language:'es',countryCode:'AR'}).toString();
 const data=await getJSON(url.toString(),86400);
 const matches=(data.results??[]).filter((p:{country_code:string})=>p.country_code==='AR');
 const place=matches.find((p:{admin1?:string})=>normalizePlace(p.admin1??'')===normalizePlace(province))??(matches.length===1?matches[0]:null);
 return place?{name:place.name,lat:place.latitude,lon:place.longitude}:null;
}
const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:null;
export async function getWeatherForecast(city:string,province:string):Promise<WeatherForecast>{
 const place=await locate(city,province);if(!place)throw new Error('No pudimos ubicar esta ciudad. Revisá localidad y provincia en Proyectos.');
 const url=new URL('https://api.open-meteo.com/v1/forecast');
 url.search=new URLSearchParams({latitude:String(place.lat),longitude:String(place.lon),current:'temperature_2m,weather_code,is_day,precipitation',hourly:'precipitation,precipitation_probability',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',forecast_days:'5',timezone:'America/Argentina/Buenos_Aires'}).toString();
 const data=await getJSON(url.toString());
 if(!data.current?.time||!Array.isArray(data.daily?.time)||!data.daily.time.length)throw new Error('Incomplete weather');
 return {location:place.name,updatedAt:data.current.time,current:{time:data.current.time,temperature:number(data.current.temperature_2m),code:number(data.current.weather_code),isDay:data.current.is_day===1,rain:number(data.current.precipitation)},days:data.daily.time.map((date:string,i:number)=>({date,code:number(data.daily.weather_code?.[i]),min:number(data.daily.temperature_2m_min?.[i]),max:number(data.daily.temperature_2m_max?.[i]),rain:number(data.daily.precipitation_sum?.[i]),probability:number(data.daily.precipitation_probability_max?.[i])})),hours:(data.hourly?.time??[]).map((time:string,i:number)=>({time,rain:number(data.hourly.precipitation?.[i]),probability:number(data.hourly.precipitation_probability?.[i])}))};
}
