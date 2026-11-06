import {getWeatherForecast} from '../../../lib/weather-service';
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;const city=(params.get('city')??'Buenos Aires').trim();const province=(params.get('province')??'CABA').trim();
 if(city.length<2||city.length>80||province.length>80)return Response.json({error:'Localidad inválida.'},{status:400});
 try{return Response.json(await getWeatherForecast(city,province),{headers:{'Cache-Control':'public, max-age=300, s-maxage=900, stale-while-revalidate=300'}});}
 catch{return Response.json({error:'El servicio meteorológico no está disponible para esta localidad. Volvé a intentar en unos minutos.'},{status:503});}
}
