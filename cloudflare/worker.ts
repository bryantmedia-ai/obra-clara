import {handleOrderFiles,storedAttachments} from "./order-files";
import {reduceDemoProjects} from '../lib/project-scope-migration';
import {applyCommand, emptyState, snapshot, type Command, type SharedState} from '../lib/demo-model';
import {handleFujiEscrow, stampFujiCheckout} from './fuji-route';

// Small structural interfaces keep the Next.js build independent of Wrangler.
type Statement = {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<{meta: {changes: number}}>;
};
export type Env = {DB: {prepare(sql: string): Statement}; FUJI_RPC_URL?: string; FUJI_ALLOW_LOCAL_CHAIN?: string; FUJI_ASSET_SYMBOL?: string; FUJI_ASSET_ADDRESS?: string; FUJI_ASSET_DECIMALS?: string; FUJI_ASSET_SIMULATION?: string};
const origins = new Set([
  'https://obra-clara-comprador.vercel.app',
  'https://obra-clara-proveedor.vercel.app',
  'https://obra-clara-gray.vercel.app',
]);
const maxBytes = 1_500_000;
function headers(origin: string | null) {
  return {
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-OC-New-Workspace',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    ...(origin && origins.has(origin) ? {'Access-Control-Allow-Origin': origin} : {}),
  };
}
async function body(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) throw new Error('Solicitud demasiado grande.');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Solicitud vacía.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const item = await reader.read(); if (item.done) break;
    size += item.value.byteLength;
    if (size > maxBytes) {await reader.cancel(); throw new Error('Solicitud demasiado grande.');}
    chunks.push(item.value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes)) as Command;
}
export async function handle(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('origin'); const h = headers(origin);
  const json = (data: unknown, status = 200) => Response.json(data, {status, headers: h});
  if (origin && !origins.has(origin)) return json({error: 'Origen no autorizado.'}, 403);
  if (new URL(request.url).pathname === '/health' && request.method === 'GET') {
    try {await env.DB.prepare('SELECT 1 AS ok').first(); return json({ok: true, storage: 'd1'});}
    catch {return json({ok: false}, 503);}
  }
  const inbox=new URL(request.url).pathname === '/api/messages';const files=new URL(request.url).pathname.startsWith('/api/order-files');const fuji=new URL(request.url).pathname === '/api/fuji-escrow';
  if (!inbox && !files && !fuji && new URL(request.url).pathname !== '/api/demo') return json({error: 'Ruta no encontrada.'}, 404);
  if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: h});
  if (!(inbox?['GET']:['GET','POST']).includes(request.method)) return json({error: 'Método no permitido.'}, 405);
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return json({error: 'Sesión requerida.'}, 401);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const id = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  if(files){try{return await handleOrderFiles(request,env,id,h);}catch(error){return json({error:error instanceof Error?error.message:'No se pudo guardar el archivo.'},400);}}
  if(fuji){try{return await handleFujiEscrow(request,env,id,h);}catch(error){return json({error:error instanceof Error?error.message:'No se pudo verificar el recibo.'},400);}}
  let command: Command | null = null;
  try {
    if (request.method === 'POST') {
      command = await body(request);
      if (!command || typeof command.id !== 'string' || typeof command.type !== 'string' || !('payload' in command)) throw new Error('Operación inválida.');
    }
  } catch (error) {return json({error: error instanceof Error ? error.message : 'Solicitud inválida.'}, 400);}
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const row = await env.DB.prepare('SELECT revision, state FROM workspaces WHERE id = ?').bind(id).first<{revision: number; state: string}>();
      if (!row && request.headers.get('X-OC-New-Workspace') !== '1') {
        // Never silently seed over an existing Vercel workspace whose export is blocked.
        return json({error: 'Tu espacio anterior está conservado en Vercel y pendiente de recuperación. No se reemplazaron tus datos.', code: 'MIGRATION_REQUIRED'}, 409);
      }
      const loaded: SharedState = row ? JSON.parse(row.state) : emptyState();
      if(inbox)return json({revision:loaded.revision,orderThreads:loaded.orderThreads??[]});
      const state=reduceDemoProjects(loaded);
      if(command?.type==='orderchat.send'){const payload=command.payload as Record<string,unknown>;try{payload.attachments=await storedAttachments(env,id,String(payload.orderId),payload.attachments);}catch(error){return json({error:error instanceof Error?error.message:'Adjuntos inválidos.'},400);}}
      if(command?.type==='fuji.checkout')command=stampFujiCheckout(command,env);
      let next = state;
      if (command) {
        try {next = applyCommand(state, command);}
        catch (error) {return json({error: error instanceof Error ? error.message : 'Operación inválida.'}, 400);}
      }
      if (row && next === loaded) return json(snapshot(state));
      const serialized = JSON.stringify(next);
      if (new TextEncoder().encode(serialized).byteLength > 1_800_000) return json({error: 'El espacio alcanzó su límite de tamaño. Los datos se conservan.'}, 413);
      const now = new Date().toISOString();
      const result = row
        ? await env.DB.prepare('UPDATE workspaces SET state = ?, revision = ?, updated_at = ? WHERE id = ? AND revision = ?').bind(serialized, next.revision, now, id, row.revision).run()
        : await env.DB.prepare('INSERT OR IGNORE INTO workspaces (id, revision, state, updated_at) VALUES (?, ?, ?, ?)').bind(id, next.revision, serialized, now).run();
      if (result.meta.changes) return json(snapshot(next));
    }
    return json({error: 'Otra operación modificó el espacio. Reintentá.'}, 409);
  } catch {
    return json({error: 'No se pudo acceder al almacenamiento compartido. Los datos existentes se conservan; intentá reconectar más tarde.'}, 503);
  }
}
export default {fetch: handle};
