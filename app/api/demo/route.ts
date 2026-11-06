import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const api='https://obra-clara-api.obra-clara.workers.dev/api/demo';
const origins=new Set(['https://obra-clara-gray.vercel.app','https://obra-clara-comprador.vercel.app','https://obra-clara-proveedor.vercel.app']);
// Keep the old API URL compatible without accessing the suspended Blob store.
async function handle(req:NextRequest){
 const origin=req.headers.get('origin');const headers={'Cache-Control':'no-store','Vary':'Origin',...(origin&&origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'Authorization, Content-Type, X-OC-New-Workspace','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
 if(origin&&!origins.has(origin))return NextResponse.json({error:'Origen no autorizado.'},{status:403,headers});
 if(req.method==='OPTIONS')return new NextResponse(null,{status:204,headers});
 const authorization=req.headers.get('authorization')??'';
 if(!/^Bearer [a-f0-9]{64}$/.test(authorization))return NextResponse.json({error:'Sesión requerida.'},{status:401,headers});
 try{
  if(Number(req.headers.get('content-length')??0)>1500000)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413,headers});
  const body=req.method==='POST'?await req.text():undefined;
  if(body&&new TextEncoder().encode(body).byteLength>1500000)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413,headers});
  const response=await fetch(api,{method:req.method,headers:{Authorization:authorization,...(origin?{Origin:origin}:{}),...(body?{'Content-Type':'application/json'}:{}),...(req.headers.get('X-OC-New-Workspace')==='1'?{'X-OC-New-Workspace':'1'}:{})},body,cache:'no-store',signal:AbortSignal.timeout(20000)});
  return new NextResponse(response.body,{status:response.status,headers:{...headers,'Content-Type':response.headers.get('content-type')??'application/json'}});
 }catch{return NextResponse.json({error:'No se pudo conectar con el almacenamiento compartido. Reintentá en unos instantes.'},{status:503,headers});}
}
export const GET=handle;export const POST=handle;export const OPTIONS=handle;
