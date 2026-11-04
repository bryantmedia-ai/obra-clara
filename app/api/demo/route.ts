import {NextRequest,NextResponse} from 'next/server';
import {get,head,put,BlobNotFoundError,BlobPreconditionFailedError,BlobServiceRateLimited} from '@vercel/blob';
import {createHash} from 'node:crypto';
import {applyCommand,emptyState,snapshot,type SharedState} from '@/lib/demo-model';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const origins=['https://obra-clara-gray.vercel.app','https://obra-clara-comprador.vercel.app','https://obra-clara-proveedor.vercel.app'];
function headers(req:NextRequest){const origin=req.headers.get('origin');return {'Cache-Control':'no-store','Vary':'Origin',...(origin&&origins.includes(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};}
export async function OPTIONS(req:NextRequest){return new NextResponse(null,{status:204,headers:headers(req)});}
async function handle(req:NextRequest){
 const h=headers(req);const origin=req.headers.get('origin');if(origin&&!origins.includes(origin))return NextResponse.json({error:'Origen no autorizado.'},{status:403,headers:h});
 const token=req.headers.get('authorization')?.replace(/^Bearer /,'');if(!token||!/^[a-f0-9]{64}$/.test(token))return NextResponse.json({error:'Sesión requerida.'},{status:401,headers:h});
 const path='workspaces/'+createHash('sha256').update(token).digest('hex')+'.json';
 try{
  if(Number(req.headers.get('content-length')??0)>1500000)throw new Error('Solicitud demasiado grande.');
  const command=req.method==='POST'?await req.json():null;
  for(let attempt=0;attempt<5;attempt++){
   let metadata=null;if(command){try{metadata=await head(path);}catch(e){if(!(e instanceof BlobNotFoundError))throw e;}}
   const blob=await get(path,{access:'private',useCache:false});if(command&&!!metadata!==!!blob)continue;const state:SharedState=blob?JSON.parse(await new Response(blob.stream).text()):emptyState();
   if(!command)return NextResponse.json(snapshot(state),{headers:h});
   if(metadata){const after=await head(path);if(after.etag!==metadata.etag)continue;}
   const next=applyCommand(state,command);if(next===state)return NextResponse.json(snapshot(state),{headers:h});
   try{await put(path,JSON.stringify(next),{access:'private',addRandomSuffix:false,contentType:'application/json',...(blob?{allowOverwrite:true,ifMatch:metadata!.etag}:{allowOverwrite:false})});return NextResponse.json(snapshot(next),{headers:h});}
   catch(error){const retry=error instanceof BlobPreconditionFailedError||error instanceof BlobServiceRateLimited||(error instanceof Error&&/already exists/i.test(error.message));if(!retry||attempt===4)throw error;await new Promise(r=>setTimeout(r,Math.max(1100,error instanceof BlobServiceRateLimited?error.retryAfter*1000:0)));}
  }
 }catch(error){console.error('Shared workspace:',error instanceof Error?{kind:error.constructor.name,message:error.message.replace(/vercel_blob_rw_[A-Za-z0-9_]+/g,'[redacted]')}: 'error');return NextResponse.json({error:error instanceof Error&& !/token|blob|storage/i.test(error.message)?error.message:'No se pudo guardar. Intentá nuevamente.'},{status:400,headers:h});}
 return NextResponse.json({error:'Reintentá la operación.'},{status:409,headers:h});
}
export const GET=handle;export const POST=handle;
