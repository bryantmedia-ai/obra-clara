import {AVALANCHE_ARGT, AVALANCHE_CHAIN_ID, ARBITRUM_CHAIN_ID, readAssetConfig, type AssetConfig} from "../lib/fuji-asset";
import {commitVerified, escrowListLabel, type FujiKind, type Verdict} from "../lib/fuji-escrow";
import {verifyEscrowAction} from "../lib/fuji-escrow-verify";
import {escrowOrderPdf, receptionLink} from "../lib/escrow-order-document";
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
  RESEND_API_KEY?: string;
  OC_RECEIPT_EMAIL_FROM?: string;
  OC_RECEIPT_EMAIL_TO?: string;
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
  const body = await request.json() as {action?: string; orderId?: string; txHash?: string; kind?: FujiKind; phase?: string; reception?: unknown};
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
    if (kind === "settle" && order?.escrow && body.reception && (verdict.status === "pending" || verdict.status === "confirmed")) {
      const {name, quantity, signature} = body.reception as {name?: unknown; quantity?: unknown; signature?: unknown};
      if (typeof name !== "string" || name.trim().split(/\s+/).length < 2 || name.length > 100 ||
          typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 0 || quantity > Number(order.escrow.quantity) ||
          typeof signature !== "string" || signature.length > 100_000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(signature) ||
          (verdict.status === "confirmed" && String(quantity) !== verdict.received)) {
        return json({error: "El remito no coincide con la recepción."}, 400);
      }
      if (!order.escrow.reception || order.escrow.reception.txHash !== verdict.hash) {
        order.escrow.reception = {name: name.trim(), quantity, signature, txHash: verdict.hash};
      }
    }
    if (kind === "settle" && verdict.status === "confirmed" && order?.escrow?.reception &&
        (order.escrow.reception.txHash !== verdict.hash || String(order.escrow.reception.quantity) !== verdict.received)) {
      delete order.escrow.reception;
    }
    const serialized = JSON.stringify(state);
    if (serialized !== before) {
      state.revision += 1;
      const saved = JSON.stringify(state);
      const result = await env.DB.prepare("UPDATE workspaces SET state = ?, revision = ?, updated_at = ? WHERE id = ? AND revision = ?").bind(saved, state.revision, new Date().toISOString(), workspaceId, row.revision).run();
      if (!result.meta.changes) continue;
      await env.DB.prepare("INSERT OR REPLACE INTO fuji_escrow_receipts (workspace_id, order_id, kind, tx_hash, status, reason, simulation, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(workspaceId, order?.id || "", kind, verdict.hash, verdict.status, verdict.reason, verdict.simulation ? 1 : 0, new Date().toISOString()).run();
    }
    let email: string | undefined;
    if (kind === "fund" && verdict.status === "confirmed" && order?.escrow && !verdict.simulation && !order.escrow.receiptEmailSentAt) {
      email = await sendReceiptEmail(env, order, verdict.hash).catch(() => "error");
      if (email === "enviado") {
        const revision = state.revision;
        order.escrow.receiptEmailSentAt = new Date().toISOString();
        state.revision += 1;
        await env.DB.prepare("UPDATE workspaces SET state = ?, revision = ?, updated_at = ? WHERE id = ? AND revision = ?")
          .bind(JSON.stringify(state), state.revision, order.escrow.receiptEmailSentAt, workspaceId, revision).run();
      }
    }
    return json({verdict, email, order: order ? state.orders.find(item => item.id === order.id) : null, deployment: state.fujiDeployment ?? null, asset: publicAsset(asset)});
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

async function sendReceiptEmail(env: FujiEnv, order: SharedState["orders"][number], hash: string) {
  if (!env.RESEND_API_KEY || !env.OC_RECEIPT_EMAIL_FROM || !env.OC_RECEIPT_EMAIL_TO) return "sin configuración";
  const url = receptionLink(order.id);
  const pdf = escrowOrderPdf({
    id: order.id, project: order.project.name, product: order.lines[0].name,
    quantity: Number(order.escrow!.quantity), total: `5 ${order.escrow!.symbol}`, supplier: order.supplier,
  });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {"Authorization": "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json", "Idempotency-Key": "escrow-receipt/" + hash},
    body: JSON.stringify({
      from: env.OC_RECEIPT_EMAIL_FROM,
      to: [env.OC_RECEIPT_EMAIL_TO],
      subject: "Obra Clara | Orden reservada " + order.id,
      text: "La reserva está confirmada. Abrí el formulario de recepción: " + url + "\nEl QR del PDF abre el mismo formulario.",
      attachments: [{filename: "Orden-" + order.id + ".pdf", content: btoa(pdf)}],
    }),
  });
  return response.ok ? "enviado" : "error";
}
