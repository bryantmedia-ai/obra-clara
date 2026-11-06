import type {Env} from './worker';
import type {SharedState} from '../lib/demo-model';
import {orderChunkSize,validateOrderAttachment,type OrderAttachment} from '../lib/order-attachments';
type StoredFile={id:string;order_id:string;name:string;media_type:string;size:number;ready:number;uploader_role:string};
export const fileDescriptor=(file:StoredFile):OrderAttachment=>({id:file.id,orderId:file.order_id,name:file.name,type:file.media_type,size:file.size});
async function bytes(request:Request,max:number){if(Number(request.headers.get('content-length')??0)>max)throw new Error('El archivo o fragmento supera el tamaño permitido.');const reader=request.body?.getReader();if(!reader)throw new Error('Contenido vacío.');let size=0;const chunks:Uint8Array[]=[];while(true){const result=await reader.read();if(result.done)break;size+=result.value.byteLength;if(size>max){await reader.cancel();throw new Error('El archivo o fragmento supera el tamaño permitido.');}chunks.push(result.value);}const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}return data;}
export async function storedAttachments(env:Env,workspace:string,orderId:string,input:unknown){if(input===undefined)return [];if(!Array.isArray(input)||input.length>6)throw new Error('Podés adjuntar hasta 6 archivos por mensaje.');const result:OrderAttachment[]=[];for(const item of input){const reference=validateOrderAttachment(item,orderId),file=await env.DB.prepare('SELECT id,order_id,name,media_type,size,ready,uploader_role FROM order_files WHERE workspace_id = ? AND id = ?').bind(workspace,reference.id).first<StoredFile>();if(!file||!file.ready||file.order_id!==orderId)throw new Error('El archivo todavía no terminó de guardarse o pertenece a otra orden.');result.push(fileDescriptor(file));}return result;}
export async function handleOrderFiles(request:Request,env:Env,workspace:string,headers:Record<string,string>){
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers});
 const row=await env.DB.prepare('SELECT state FROM workspaces WHERE id = ?').bind(workspace).first<{state:string}>();if(!row)return json({error:'Espacio de trabajo no encontrado.'},404);
 const state=JSON.parse(row.state) as SharedState,path=new URL(request.url).pathname;
 if(path==='/api/order-files'&&request.method==='POST'){
  const payload=JSON.parse(new TextDecoder().decode(await bytes(request,16000))),order=state.orders.find(o=>o.id===payload.orderId);
  if(!order)return json({error:'Seleccioná una orden existente.'},400);
  if(!['buyer','provider'].includes(payload.role)||payload.role==='provider'&&payload.supplierSlug!==order.supplierSlug)return json({error:'El perfil no corresponde a esta orden.'},403);
  const attachment=validateOrderAttachment(payload,order.id),existing=await env.DB.prepare('SELECT id,order_id,name,media_type,size,ready,uploader_role FROM order_files WHERE workspace_id = ? AND id = ?').bind(workspace,attachment.id).first<StoredFile>();
  if(existing){if(existing.order_id!==attachment.orderId||existing.name!==attachment.name||existing.size!==attachment.size||existing.media_type!==attachment.type||existing.uploader_role!==payload.role)return json({error:'La referencia de archivo ya está en uso.'},409);return json({file:fileDescriptor(existing),ready:!!existing.ready,chunkSize:orderChunkSize});}
  const inserted=await env.DB.prepare('INSERT INTO order_files (workspace_id,id,order_id,name,media_type,size,uploader_role,created_at) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COALESCE(SUM(size),0) FROM order_files WHERE workspace_id = ?)+? <= 104857600 AND (SELECT COALESCE(SUM(size),0) FROM order_files)+? <= 367001600').bind(workspace,attachment.id,order.id,attachment.name,attachment.type,attachment.size,payload.role,new Date().toISOString(),workspace,attachment.size,attachment.size).run();
  if(!inserted.meta.changes)return json({error:'El espacio de adjuntos está completo. Los archivos guardados se conservan.'},413);
  return json({file:attachment,ready:false,chunkSize:orderChunkSize});
 }
 const match=/^\/api\/order-files\/([-a-zA-Z0-9]{20,80})(?:\/(complete|chunks\/(\d+)))?$/.exec(path);if(!match)return json({error:'Archivo no encontrado.'},404);
 const file=await env.DB.prepare('SELECT id,order_id,name,media_type,size,ready,uploader_role FROM order_files WHERE workspace_id = ? AND id = ?').bind(workspace,match[1]).first<StoredFile>();if(!file||!state.orders.some(o=>o.id===file.order_id))return json({error:'Archivo no encontrado para esta orden.'},404);
 if(match[3]!==undefined&&request.method==='POST'){
  if(file.ready)return json({error:'El archivo ya está guardado y no puede sobrescribirse.'},409);
  const part=Number(match[3]),count=Math.ceil(file.size/orderChunkSize);if(part<0||part>=count)return json({error:'Fragmento inválido.'},400);
  const data=await bytes(request,orderChunkSize),expected=Math.min(orderChunkSize,file.size-part*orderChunkSize);if(data.length!==expected)return json({error:'El fragmento recibido está incompleto.'},400);
  await env.DB.prepare('INSERT INTO order_file_chunks (workspace_id,file_id,part,data) VALUES (?,?,?,?) ON CONFLICT(workspace_id,file_id,part) DO UPDATE SET data=excluded.data').bind(workspace,file.id,part,data.buffer).run();return json({ok:true});
 }
 if(match[2]==='complete'&&request.method==='POST'){
  const chunks=await env.DB.prepare('SELECT COUNT(*) AS count,COALESCE(SUM(length(data)),0) AS size FROM order_file_chunks WHERE workspace_id = ? AND file_id = ?').bind(workspace,file.id).first<{count:number;size:number}>();if(!chunks||chunks.count!==Math.ceil(file.size/orderChunkSize)||chunks.size!==file.size)return json({error:'La carga está incompleta. Reintentá subir el archivo.'},400);
  await env.DB.prepare('UPDATE order_files SET ready = 1 WHERE workspace_id = ? AND id = ?').bind(workspace,file.id).run();return json({file:fileDescriptor(file),ready:true});
 }
 if((!match[2]||match[3]!==undefined)&&request.method==='GET'){
  const linked=state.orderThreads?.some(thread=>thread.orderId===file.order_id&&thread.messages.some(message=>message.attachments?.some(item=>item.id===file.id)));
  if(!file.ready||!linked)return json({error:'El archivo todavía no fue enviado en el chat de esta orden.'},404);
  if(match[3]!==undefined){const part=Number(match[3]);if(part<0||part>=Math.ceil(file.size/orderChunkSize))return json({error:'Fragmento inválido.'},400);const chunk=await env.DB.prepare('SELECT data FROM order_file_chunks WHERE workspace_id = ? AND file_id = ? AND part = ?').bind(workspace,file.id,part).first<{data:ArrayBuffer|number[]}>();if(!chunk)return json({error:'Fragmento no encontrado.'},404);const data=new Uint8Array(chunk.data as ArrayBuffer);return new Response(data,{headers:{...headers,'Content-Type':'application/octet-stream','Content-Length':String(data.length),'X-Content-Type-Options':'nosniff'}});}
  let part=0;const count=Math.ceil(file.size/orderChunkSize);
  const stream=new ReadableStream<Uint8Array>({async pull(controller){if(part>=count){controller.close();return;}try{const chunk=await env.DB.prepare('SELECT data FROM order_file_chunks WHERE workspace_id = ? AND file_id = ? AND part = ?').bind(workspace,file.id,part++).first<{data:ArrayBuffer|number[]}>();if(!chunk)throw new Error('Archivo incompleto.');controller.enqueue(new Uint8Array(chunk.data as ArrayBuffer));}catch(error){controller.error(error);}}});
  return new Response(stream,{headers:{...headers,'Content-Type':file.media_type,'Content-Length':String(file.size),'Content-Disposition':`attachment; filename="${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,'X-Content-Type-Options':'nosniff'}});
 }
 return json({error:'Método no permitido.'},405);
}
