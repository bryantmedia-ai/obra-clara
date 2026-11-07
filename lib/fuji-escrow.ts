import {completeMarketplaceCatalog, type Product} from "../components/marketplace-data";
import {projectReady, type Project} from "../components/project-data";
import {validateOrderDelivery, type OrderDelivery} from "./order-delivery";
import {LIVE_CEMENT_OFFER_ID, LIVE_CEMENT_QUANTITY, LIVE_CEMENT_WHOLE_TOKENS, type AssetConfig} from "./fuji-asset";
import {sha256Hex} from "./sha256";

export type FujiPhase = "activo pendiente" | "sin reserva" | "reserva pendiente" | "reservada" | "liquidación pendiente" | "liquidada" | "reembolso pendiente" | "reembolsada";
export type FujiKind = "deployment" | "fund" | "authorize" | "settle" | "refund";
export type FujiAttempt = {hash: string; kind: FujiKind; status: "pending" | "failed" | "rejected" | "confirmed"; reason: string; at: string};
export type FujiEscrowRecord = {
  rail: "fuji-erc20";
  mode: "partial" | "expiry";
  symbol: "USDT" | "USDC";
  simulation: boolean;
  chainId: 43113;
  token: string;
  contract: string;
  orderId: string;
  buyer: string;
  seller: string;
  delegate: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  decimals: string;
  deadline: string;
  received: string;
  sellerAmount: string;
  buyerRefund: string;
  phase: FujiPhase;
  dispatchedAt: string;
  attempts: FujiAttempt[];
  wholeTokens: "5";
};
export type FujiDeployment = {contract: string; token: string; decimals: string; symbol: "USDT" | "USDC"; simulation: boolean; tx: string};

export type EscrowOrder = {
  id: string;
  requestId: string;
  supplierSlug: string;
  supplier: string;
  project: Project;
  lines: {id: string; name: string; image: string; quantity: number; received: number; unitPrice: number; pickup: string; depositPercent: number; shippingIncluded?: boolean; deliveryChoice?: "arranged"}[];
  status: "Pendiente" | "Aceptada" | "En preparación" | "Despachada" | "Recibida" | "Cancelada";
  createdAt: string;
  updatedAt: string;
  transports: [];
  shippingPending: boolean;
  advanceApproved: boolean;
  paid: number;
  receipts: [];
  delivery?: OrderDelivery;
  escrow?: FujiEscrowRecord;
};
export type EscrowState = {orders: EscrowOrder[]; offers: Product[]; projects: Project[]; finance?: {wallet: number}; fujiDeployment?: FujiDeployment};

function fail(text: string): never { throw new Error(text); }

export function commercialBase(decimals: number) {
  if (!Number.isInteger(decimals) || decimals < 2 || decimals > 18) fail("Decimales del activo no verificados.");
  const scale = 10n ** BigInt(decimals);
  if (scale % 20n !== 0n) fail("Esos decimales no representan 0,05 sin redondeo.");
  const unitPrice = scale / 20n;
  const quantity = BigInt(LIVE_CEMENT_QUANTITY);
  const amount = unitPrice * quantity;
  if (amount !== LIVE_CEMENT_WHOLE_TOKENS * scale) fail("El importe no cierra en 5 unidades del activo.");
  return {quantity, unitPrice, amount};
}

export function settlement(amount: bigint, quantity: bigint, received: bigint) {
  if (quantity <= 0n) fail("Cantidad inválida.");
  if (received < 0n || received > quantity) fail("Recepción fuera de rango.");
  const seller = amount * received / quantity;
  const buyer = amount - seller;
  return {seller, buyer};
}

export function approveSteps(current: bigint, needed: bigint) {
  if (needed <= 0n) fail("Importe inválido.");
  if (current === needed) return [] as bigint[];
  return current > 0n ? [0n, needed] : [needed];
}

export function orderIdFor(businessId: string) {
  return "0x" + sha256Hex(`obra-clara:fuji:v1:${businessId}`);
}

export function formatBaseUnits(amount: string, decimals: string) {
  if (!/^\d+$/.test(amount) || !/^\d+$/.test(decimals)) return "";
  const scale = 10n ** BigInt(decimals);
  const value = BigInt(amount);
  const fraction = (value % scale).toString().padStart(Number(decimals), "0").replace(/0+$/, "");
  return `${value / scale}${fraction ? "," + fraction : ""}`;
}

export function escrowListLabel(record: FujiEscrowRecord, status = "") {
  if (record.simulation) return "Simulación local. No es USDT oficial ni un saldo de Fuji.";
  if (record.phase === "activo pendiente" || !record.amount) return "USDT. Objetivo: 5 tokens de prueba. Reserva no confirmada.";
  const amount = formatBaseUnits(record.amount, record.decimals);
  if (record.phase === "liquidada") {
    const missing = BigInt(record.quantity) - BigInt(record.received || "0");
    return `Cerrada. ${record.received} recibidas y ${missing} no recibidas. Vendedor ${formatBaseUnits(record.sellerAmount, record.decimals)} ${record.symbol}. Devuelto ${formatBaseUnits(record.buyerRefund, record.decimals)} ${record.symbol}. No queda saldo ni entrega pendiente.`;
  }
  if (record.phase === "reembolsada") return `Cerrada sin recepción. Reembolso total confirmado: ${amount} ${record.symbol}.`;
  if (status === "Despachada" && record.phase === "reservada") return `Despachada. La reserva sigue bloqueada: ${amount} ${record.symbol}. Despachar no libera fondos.`;
  if (record.phase === "reservada") return `Reserva confirmada por recibo: ${amount} ${record.symbol}. Todavía no se liquidó.`;
  if (record.phase === "liquidación pendiente" || record.phase === "reembolso pendiente" || record.phase === "reserva pendiente") return "Transacción enviada. Pendiente de confirmación del recibo. No es una reserva ni una liquidación.";
  return `Objetivo ${amount} ${record.symbol}. Sin recibo de reserva.`;
}

function addressOf(value: unknown, label: string) {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(value) || /^0x0{40}$/i.test(value)) fail(`Ingresá la dirección Fuji de ${label}. No se inventa una.`);
  return value.toLowerCase();
}

function holdsStock(order: EscrowOrder) {
  return order.status !== "Cancelada" && order.escrow?.phase !== "liquidada" && order.escrow?.phase !== "reembolsada" && order.escrow?.mode !== "expiry";
}

export function applyFujiCommand(s: EscrowState, type: string, payload: Record<string, unknown>, commandId: string, now: string, today: string) {
  const walletBefore = s.finance?.wallet;
  if (type === "fuji.checkout") checkout(s, payload, commandId, now, today);
  else if (type === "fuji.dispatch") dispatch(s, payload, now);
  else fail("Esta operación no confirma fondos. La reserva y la liquidación salen de un recibo de Fuji.");
  if (s.finance && s.finance.wallet !== walletBefore) fail("La compra de cemento no mueve el registro administrativo.");
}

function checkout(s: EscrowState, payload: Record<string, unknown>, commandId: string, now: string, today: string) {
  const asset = payload.serverAsset as AssetConfig | undefined;
  if (!asset || (asset.symbol !== "USDT" && asset.symbol !== "USDC")) fail("La configuración del activo la define el servidor.");
  const mode = payload.mode === "expiry" ? "expiry" : payload.mode === "partial" ? "partial" : fail("Tipo de orden inválido.");
  if (payload.offerId !== LIVE_CEMENT_OFFER_ID || payload.quantity !== LIVE_CEMENT_QUANTITY) fail("La única compra habilitada es 100 bolsas de cemento Loma Negra de Corralón Norte.");
  const product = completeMarketplaceCatalog.find(item => item.id === LIVE_CEMENT_OFFER_ID);
  const project = s.projects.find(item => item.id === payload.projectId);
  if (!product || !project || !projectReady(project)) fail("Elegí un proyecto activo y completo.");
  const delivery = validateOrderDelivery(payload.delivery, today);
  const seller = addressOf(payload.seller, "la vendedora");
  const nowSec = Math.floor(Date.parse(now) / 1000);
  const deadline = payload.deadline;
  if (typeof deadline !== "number" || !Number.isInteger(deadline)) fail("Definí el vencimiento de la orden.");
  if (mode === "expiry" && (deadline < nowSec + 60 || deadline > nowSec + 3600)) fail("El vencimiento corto tiene que quedar entre 1 y 60 minutos.");
  if (mode === "partial" && (deadline < nowSec + 600 || deadline > nowSec + 30 * 86400)) fail("El plazo de la compra tiene que ser de al menos 10 minutos y como máximo 30 días.");
  if (s.orders.some(order => order.escrow?.mode === mode && order.escrow.phase !== "liquidada" && order.escrow.phase !== "reembolsada" && order.status !== "Cancelada")) fail(mode === "partial" ? "Ya hay una compra de 100 bolsas abierta." : "Ya hay una orden de vencimiento corto abierta.");
  if (mode === "partial") {
    const offer = s.offers.find(item => item.id === product.id);
    const stock = offer?.stock ?? product.stock;
    const held = s.orders.filter(order => holdsStock(order)).reduce((sum, order) => sum + order.lines.filter(line => line.id === product.id).reduce((lineSum, line) => lineSum + line.quantity - line.received, 0), 0);
    if (stock - held < LIVE_CEMENT_QUANTITY) fail("No hay 100 bolsas disponibles para esta compra.");
  }
  const ready = asset.ready && asset.decimals != null && asset.address;
  const terms = ready ? commercialBase(asset.decimals as number) : null;
  const id = "OC-FUJI-" + commandId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const record: FujiEscrowRecord = {
    rail: "fuji-erc20", mode, symbol: asset.symbol, simulation: ready ? asset.simulation : false, chainId: 43113,
    token: ready ? asset.address.toLowerCase() : "", contract: "", orderId: orderIdFor(id), buyer: "", seller,
    delegate: "", quantity: String(LIVE_CEMENT_QUANTITY), unitPrice: terms ? terms.unitPrice.toString() : "",
    amount: terms ? terms.amount.toString() : "", decimals: terms ? String(asset.decimals) : "", deadline: String(deadline),
    received: "", sellerAmount: "", buyerRefund: "", phase: ready ? "sin reserva" : "activo pendiente", dispatchedAt: "", attempts: [], wholeTokens: "5",
  };
  s.orders.unshift({
    id, requestId: commandId, supplierSlug: product.supplier.slug, supplier: product.supplier.name, project, delivery,
    lines: [{id: product.id, name: product.name, image: product.image, quantity: LIVE_CEMENT_QUANTITY, received: 0, unitPrice: 0, pickup: `Depósito ${product.supplier.name} · ${product.supplier.address}`, depositPercent: 0, shippingIncluded: product.shippingIncluded, deliveryChoice: "arranged"}],
    status: "Pendiente", createdAt: now, updatedAt: now, transports: [], shippingPending: false, advanceApproved: false, paid: 0, receipts: [], escrow: record,
  });
}

function dispatch(s: EscrowState, payload: Record<string, unknown>, now: string) {
  const order = s.orders.find(item => item.id === payload.orderId);
  if (!order?.escrow) fail("Orden no encontrada.");
  if (order.escrow.phase !== "reservada") fail("Solo se despacha una reserva confirmada por recibo. Esta orden no la tiene.");
  if (order.status === "Despachada" || order.status === "Recibida") return;
  order.status = "Despachada";
  order.escrow.dispatchedAt = now;
  order.updatedAt = now;
}

export type Verdict = {
  status: "pending" | "failed" | "rejected" | "confirmed";
  reason: string;
  kind: FujiKind;
  hash: string;
  businessId: string;
  simulation: boolean;
  chainId: number;
  contract?: string;
  token?: string;
  decimals?: string;
  symbol?: "USDT" | "USDC";
  buyer?: string;
  seller?: string;
  delegate?: string;
  orderId?: string;
  quantity?: string;
  unitPrice?: string;
  amount?: string;
  deadline?: string;
  received?: string;
  sellerAmount?: string;
  buyerRefund?: string;
};

export function commitVerified(s: EscrowState, verdict: Verdict, now: string) {
  if (verdict.kind === "deployment") {
    if (verdict.status !== "confirmed") return s;
    return commitDeployment(s, verdict);
  }
  const order = s.orders.find(item => item.id === verdict.businessId);
  if (!order?.escrow) fail("Orden no encontrada.");
  const previous = order.escrow.attempts.find(item => item.hash === verdict.hash && item.kind === verdict.kind);
  if (previous?.status === verdict.status) return s;
  if (!order.escrow.amount || order.escrow.phase === "activo pendiente") fail("Esta orden no tiene importe: el activo de Fuji todavía no está configurado.");
  if (order.escrow.simulation !== verdict.simulation) fail("La simulación local no puede confirmar una orden oficial, ni al revés.");
  const attempt: FujiAttempt = {hash: verdict.hash, kind: verdict.kind, status: verdict.status, reason: verdict.reason, at: now};
  order.escrow.attempts = [attempt, ...order.escrow.attempts.filter(item => !(item.hash === verdict.hash && item.kind === verdict.kind))].slice(0, 20);
  if (verdict.status === "pending") {
    if (verdict.kind === "fund" && order.escrow.phase === "sin reserva") order.escrow.phase = "reserva pendiente";
    if (verdict.kind === "settle" && (order.escrow.phase === "reservada")) order.escrow.phase = "liquidación pendiente";
    if (verdict.kind === "refund" && order.escrow.phase === "reservada") order.escrow.phase = "reembolso pendiente";
  } else if (verdict.status === "failed" || verdict.status === "rejected") {
    if (verdict.kind === "fund" && order.escrow.phase === "reserva pendiente") order.escrow.phase = "sin reserva";
    if (verdict.kind === "settle" && order.escrow.phase === "liquidación pendiente") order.escrow.phase = order.status === "Despachada" ? "reservada" : "reservada";
    if (verdict.kind === "refund" && order.escrow.phase === "reembolso pendiente") order.escrow.phase = "reservada";
  } else applyConfirmed(s, order, verdict);
  order.updatedAt = now;
  return s;
}

function applyConfirmed(s: EscrowState, order: EscrowOrder, verdict: Verdict) {
  const escrow = order.escrow!;
  if (verdict.kind === "fund") {
    if (escrow.phase === "reservada" || escrow.phase === "liquidada" || escrow.phase === "reembolsada") fail("La orden ya tiene una reserva confirmada.");
    if (verdict.orderId !== escrow.orderId || verdict.seller !== escrow.seller || verdict.quantity !== escrow.quantity || verdict.unitPrice !== escrow.unitPrice || verdict.amount !== escrow.amount || verdict.deadline !== escrow.deadline || verdict.token !== escrow.token) fail("El recibo no coincide con la orden guardada.");
    escrow.phase = "reservada";
    escrow.buyer = verdict.buyer || "";
    escrow.contract = verdict.contract || escrow.contract;
    return;
  }
  if (verdict.kind === "authorize") {
    if (escrow.phase !== "reservada") fail("Primero tiene que confirmarse la reserva.");
    if (!verdict.delegate || verdict.delegate === escrow.seller) fail("El delegado no puede ser el vendedor.");
    escrow.delegate = verdict.delegate;
    return;
  }
  if (verdict.kind === "settle") {
    if (escrow.phase === "liquidada") return;
    if (escrow.phase !== "reservada" && escrow.phase !== "liquidación pendiente") fail("No hay reserva confirmada para liquidar.");
    const expected = settlement(BigInt(escrow.amount), BigInt(escrow.quantity), BigInt(verdict.received || "0"));
    if (verdict.sellerAmount !== expected.seller.toString() || verdict.buyerRefund !== expected.buyer.toString()) fail("La liquidación no conserva el total.");
    escrow.received = verdict.received || "0";
    escrow.sellerAmount = expected.seller.toString();
    escrow.buyerRefund = expected.buyer.toString();
    escrow.phase = "liquidada";
    order.lines[0].received = Number(escrow.received);
    order.status = "Recibida";
    const product = s.offers.find(item => item.id === order.lines[0].id) ?? completeMarketplaceCatalog.find(item => item.id === order.lines[0].id);
    if (product) s.offers = [...s.offers.filter(item => item.id !== product.id), {...product, stock: Math.max(0, product.stock - order.lines[0].received)}];
    return;
  }
  if (verdict.kind === "refund") {
    if (escrow.phase === "reembolsada") return;
    if (escrow.phase !== "reservada" && escrow.phase !== "reembolso pendiente") fail("No hay reserva confirmada para reembolsar.");
    if (verdict.amount !== escrow.amount) fail("El reembolso tiene que ser el total bloqueado.");
    escrow.phase = "reembolsada";
    escrow.sellerAmount = "0";
    escrow.buyerRefund = escrow.amount;
    escrow.received = "0";
    order.status = "Cancelada";
  }
}

function commitDeployment(s: EscrowState, verdict: Verdict) {
  if (verdict.status !== "confirmed" || !verdict.contract || !verdict.token || !verdict.decimals || !verdict.symbol) {
    fail(verdict.reason || "El despliegue no quedó verificado.");
  }
  if (s.fujiDeployment && s.fujiDeployment.contract.toLowerCase() === verdict.contract.toLowerCase() && s.fujiDeployment.tx === verdict.hash) return s;
  if (s.fujiDeployment) fail("Este espacio ya tiene un escrow verificado.");
  s.fujiDeployment = {contract: verdict.contract.toLowerCase(), token: verdict.token.toLowerCase(), decimals: verdict.decimals, symbol: verdict.symbol, simulation: verdict.simulation, tx: verdict.hash};
  for (const order of s.orders) if (order.escrow && !order.escrow.contract && order.escrow.simulation === verdict.simulation) order.escrow.contract = verdict.contract.toLowerCase();
  return s;
}
