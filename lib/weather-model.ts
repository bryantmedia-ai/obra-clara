export type WeatherLocation={city:string;province:string};
export type WeatherDay={date:string;code:number|null;min:number|null;max:number|null;rain:number|null;probability:number|null};
export type WeatherHour={time:string;rain:number|null;probability:number|null};
export type WeatherForecast={hours?:WeatherHour[];location:string;updatedAt:string;current:{time:string;temperature:number|null;code:number|null;isDay:boolean;rain:number|null};days:WeatherDay[]};
export const normalizePlace=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
// City/neighbourhood centres, never project addresses or browser geolocation.
export const localWeatherPlaces:Record<string,{name:string;lat:number;lon:number}>={
 'buenos aires':{name:'Buenos Aires',lat:-34.6037,lon:-58.3816},
 'palermo':{name:'Palermo',lat:-34.588,lon:-58.43},
 'nunez':{name:'Núñez',lat:-34.548,lon:-58.463},
 'belgrano':{name:'Belgrano',lat:-34.562,lon:-58.455},
 'caballito':{name:'Caballito',lat:-34.619,lon:-58.442},
 'almagro':{name:'Almagro',lat:-34.611,lon:-58.421},
 'villa urquiza':{name:'Villa Urquiza',lat:-34.574,lon:-58.49},
 'barracas':{name:'Barracas',lat:-34.646,lon:-58.384},
 'san telmo':{name:'San Telmo',lat:-34.621,lon:-58.373},
 'flores':{name:'Flores',lat:-34.629,lon:-58.463},
 'pilar':{name:'Pilar',lat:-34.458,lon:-58.915},
 'olivos':{name:'Olivos',lat:-34.507,lon:-58.488},
 'vicente lopez':{name:'Vicente López',lat:-34.525,lon:-58.476},
 'quilmes':{name:'Quilmes',lat:-34.729,lon:-58.264},
};
export function projectWeatherLocation(project:{name:string;city?:string;province?:string;zone?:string}):WeatherLocation|null{
 const city=normalizePlace(project.city??'');const province=project.province?.trim()||'Buenos Aires';
 const isCapital=['caba','capital federal','ciudad autonoma de buenos aires','ciudad de buenos aires','buenos aires'].includes(city);
 if(city&&!isCapital)return {city:project.city!.trim(),province};
 const context=normalizePlace(`${project.zone??''} ${project.name}`);
 // Infer a neighbourhood only for CABA or legacy projects without a city.
 const match=Object.entries(localWeatherPlaces).find(([key])=>key!=='buenos aires'&&(!isCapital||!['pilar','olivos','vicente lopez','quilmes'].includes(key))&&context.includes(key));
 if(match)return {city:match[1].name,province};
 return isCapital?{city:'Buenos Aires',province:'CABA'}:null;
}
export const weatherKey=(location:WeatherLocation)=>normalizePlace(location.city)+'|'+normalizePlace(location.province);
export function weatherCondition(code:number|null,isDay=true){
 if(code===null)return {emoji:'🌡️',label:'Sin información'};
 if(code===0)return {emoji:isDay?'☀️':'🌙',label:'Despejado'};
 if(code<=2)return {emoji:isDay?'🌤️':'☁️',label:'Parcialmente nublado'};
 if(code===3)return {emoji:'☁️',label:'Nublado'};
 if(code===45||code===48)return {emoji:'🌫️',label:'Niebla'};
 if(code>=95)return {emoji:'⛈️',label:'Tormentas'};
 if([71,73,75,77,85,86].includes(code))return {emoji:'🌨️',label:'Nieve'};
 if(code>=80)return {emoji:'🌦️',label:'Chaparrones'};
 if(code>=61)return {emoji:'🌧️',label:'Lluvia'};
 if(code>=51)return {emoji:'🌦️',label:'Llovizna'};
 return {emoji:'☁️',label:'Variable'};
}
export const rainyDay=(day:WeatherDay)=>(day.probability??0)>=50||(day.rain??0)>=1;
