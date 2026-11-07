import {AVALANCHE_ARGT, AVALANCHE_CHAIN_ID, ARBITRUM_CHAIN_ID, readAssetConfig, type AssetConfig} from "../lib/fuji-asset";
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
  OC_ESCROW_RAIL?: string;
  OC_ESCROW_ENABLE?: string;
  OC_ESCROW_SIMULATION?: string;
  OC_LOCAL_PREVIEW?: string;
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
  const simulation = env.OC_ESCROW_SIMULATION === "1" || env.FUJI_ASSET_SIMULATION === "1";
  if (env.OC_ESCROW_RAIL === "avalanche-argt") {
    return readAssetConfig({
      rail: "avalanche-argt",
      symbol: "ARGt",
      address: env.FUJI_ASSET_ADDRESS || AVALANCHE_ARGT,
      decimals: env.FUJI_ASSET_DECIMALS || "18",
      simulation,
      enabled: env.OC_ESCROW_ENABLE === "1",
    });
  }
  return readAssetConfig({
    symbol: env.FUJI_ASSET_SYMBOL,
    address: env.FUJI_ASSET_ADDRESS,
    decimals: env.FUJI_ASSET_DECIMALS,
    simulation,
  });
}

export function escrowRpcUrl(env: FujiEnv) {
  if (env.FUJI_RPC_URL) return env.FUJI_RPC_URL;
  return env.OC_ESCROW_RAIL === "avalanche-argt" ? "https://api.avax.network/ext/bc/C/rpc" : "https://api.avax-test.network/ext/bc/C/rpc";
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
  if (body.action === "track") return trackHash(env, body as {txHash?: string; chainId?: number}, headers);
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
      verdict = await verifyEscrowAction((method, params) => rpc(escrowRpcUrl(env), method, params), {
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
  return {...asset, address: asset.ready ? asset.address : ""};
}

async function trackHash(env: FujiEnv, body: {txHash?: string; chainId?: number}, headers: Record<string, string>) {
  const hash = (body.txHash || "").toLowerCase();
  const chainId = Number(body.chainId);
  const json = (data: unknown, status = 200) => Response.json(data, {status, headers});
  if (!/^0x[a-f0-9]{64}$/.test(hash) || (chainId !== AVALANCHE_CHAIN_ID && chainId !== ARBITRUM_CHAIN_ID)) {
    return json({verified: false, reason: "El hash o la red no se pueden consultar."});
  }
  const url = chainId === AVALANCHE_CHAIN_ID ? escrowRpcUrl(env) : "https://arb1.arbitrum.io/rpc";
  try {
    const tx = await rpc(url, "eth_getTransactionByHash", [hash]) as {to?: string | null; from?: string} | null;
    if (!tx) return json({verified: false, chainId, reason: "La RPC no devolvió esa transacción. No se inventa un puente ni un precio."});
    const receipt = await rpc(url, "eth_getTransactionReceipt", [hash]) as {status?: string} | null;
    return json({verified: true, chainId, from: tx.from || "", to: tx.to || "", status: receipt?.status || "", reason: "La RPC devolvió la transacción. No es la reserva del escrow y no se leyó una cotización."});
  } catch {
    return json({verified: false, chainId, reason: "La RPC no respondió. El hash queda sin verificar."});
  }
}

async function rpc(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({jsonrpc: "2.0", id: 1, method, params})});
  const body = await response.json() as {result?: unknown; error?: {message?: string}};
  if (body.error) throw new Error(body.error.message || "La red rechazó la consulta.");
  return body.result;
}
