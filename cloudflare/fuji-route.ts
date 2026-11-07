import {readAssetConfig, type AssetConfig} from "../lib/fuji-asset";
import {commitVerified, escrowListLabel, type FujiKind, type Verdict} from "../lib/fuji-escrow";
import {verifyEscrowAction} from "../lib/fuji-escrow-verify";
import type {Command, SharedState} from "../lib/demo-model";

type Statement = {bind(...values: unknown[]): Statement; first<T>(): Promise<T | null>; run(): Promise<{meta: {changes: number}}>};
export type FujiEnv = {
  DB: {prepare(sql: string): Statement};
  FUJI_RPC_URL?: string;
  FUJI_ALLOW_LOCAL_CHAIN?: string;
  FUJI_ASSET_SYMBOL?: string;
  FUJI_ASSET_ADDRESS?: string;
  FUJI_ASSET_DECIMALS?: string;
  FUJI_ASSET_SIMULATION?: string;
};

export function stampFujiCheckout(command: Command, env: FujiEnv): Command {
  const payload = {...(command.payload as Record<string, unknown>)};
  delete payload.serverAsset;
  delete payload.phase;
  delete payload.amount;
  delete payload.token;
  payload.serverAsset = assetFrom(env);
  return {...command, payload};
}

function assetFrom(env: FujiEnv): AssetConfig {
  return readAssetConfig({
    symbol: env.FUJI_ASSET_SYMBOL,
    address: env.FUJI_ASSET_ADDRESS,
    decimals: env.FUJI_ASSET_DECIMALS,
    simulation: env.FUJI_ASSET_SIMULATION === "1",
  });
}

export async function handleFujiEscrow(request: Request, env: FujiEnv, workspaceId: string, headers: Record<string, string>) {
  const json = (data: unknown, status = 200) => Response.json(data, {status, headers});
  const asset = assetFrom(env);
  if (request.method === "GET") {
    const row = await env.DB.prepare("SELECT state FROM workspaces WHERE id = ?").bind(workspaceId).first<{state: string}>();
    const state = row ? JSON.parse(row.state) as SharedState : null;
    return json({asset: publicAsset(asset), deployment: state?.fujiDeployment ?? null, orders: (state?.orders ?? []).filter(order => order.escrow).map(order => ({id: order.id, status: order.status, supplierSlug: order.supplierSlug, supplier: order.supplier, label: escrowListLabel(order.escrow!, order.status), escrow: order.escrow}))});
  }
  if (request.method !== "POST") return json({error: "Método no permitido."}, 405);
  const body = await request.json() as {action?: string; orderId?: string; txHash?: string; kind?: FujiKind; phase?: string};
  if (body.action !== "verify") return json({error: "Solo se acepta la verificación de un recibo. El cliente no puede marcar una reserva."}, 400);
  if (body.phase) return json({error: "El estado financiero no se acepta desde el cliente."}, 400);
  const kind = body.kind;
  if (!kind || !["deployment", "fund", "authorize", "settle", "refund"].includes(kind)) return json({error: "Tipo de recibo inválido."}, 400);
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await env.DB.prepare("SELECT revision, state FROM workspaces WHERE id = ?").bind(workspaceId).first<{revision: number; state: string}>();
    if (!row) return json({error: "No hay un espacio compartido para esta orden."}, 404);
    const state = JSON.parse(row.state) as SharedState;
    const before = row.state;
    const order = kind === "deployment" ? undefined : state.orders.find(item => item.id === body.orderId);
    if (kind !== "deployment" && !order?.escrow) return json({error: "Orden no encontrada."}, 404);
    let verdict: Verdict;
    try {
      verdict = await verifyEscrowAction((method, params) => rpc(env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc", method, params), {
        kind, hash: body.txHash || "", asset, order: order?.escrow, deployment: state.fujiDeployment ?? null, allowLocalChain: env.FUJI_ALLOW_LOCAL_CHAIN === "1",
      });
    } catch (error) {
      return json({error: error instanceof Error ? error.message : "No se pudo leer la red."}, 502);
    }
    verdict.businessId = order?.id || "";
    if (order?.escrow?.phase === "activo pendiente") return json({verdict, order, asset: publicAsset(asset)});
    try { commitVerified(state as unknown as Parameters<typeof commitVerified>[0], verdict, new Date().toISOString()); }
    catch (error) { return json({error: error instanceof Error ? error.message : "No se pudo registrar el recibo.", verdict}, 400); }
    const serialized = JSON.stringify(state);
    if (serialized !== before) {
      state.revision += 1;
      const saved = JSON.stringify(state);
      const result = await env.DB.prepare("UPDATE workspaces SET state = ?, revision = ?, updated_at = ? WHERE id = ? AND revision = ?").bind(saved, state.revision, new Date().toISOString(), workspaceId, row.revision).run();
      if (!result.meta.changes) continue;
      await env.DB.prepare("INSERT OR REPLACE INTO fuji_escrow_receipts (workspace_id, order_id, kind, tx_hash, status, reason, simulation, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(workspaceId, order?.id || "", kind, verdict.hash, verdict.status, verdict.reason, verdict.simulation ? 1 : 0, new Date().toISOString()).run();
    }
    return json({verdict, order: order ? state.orders.find(item => item.id === order.id) : null, deployment: state.fujiDeployment ?? null, asset: publicAsset(asset)});
  }
  return json({error: "Otra operación modificó el espacio. Reintentá la verificación con el mismo hash."}, 409);
}

function publicAsset(asset: AssetConfig) {
  return {symbol: asset.symbol, ready: asset.ready, simulation: asset.simulation, blocked: asset.blocked, address: asset.ready ? asset.address : "", decimals: asset.ready ? asset.decimals : null, chainId: 43113};
}

async function rpc(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({jsonrpc: "2.0", id: 1, method, params})});
  const body = await response.json() as {result?: unknown; error?: {message?: string}};
  if (body.error) throw new Error(body.error.message || "La red rechazó la consulta.");
  return body.result;
}
