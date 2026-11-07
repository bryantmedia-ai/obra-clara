import {addressOf, decodeFund, uintOf, wordsOf, escrowTopics, escrowSelectors} from "./fuji-abi";
import {settlement, type FujiEscrowRecord, type FujiKind, type Verdict} from "./fuji-escrow";
import type {AssetConfig} from "./fuji-asset";

export type Rpc = (method: string, params: unknown[]) => Promise<unknown>;
type Tx = {from?: string; to?: string | null; input?: string; hash?: string};
type Receipt = {status?: string; contractAddress?: string | null; logs?: {address?: string; topics?: string[]; data?: string}[]};
type OrderTerms = FujiEscrowRecord;

const same = (a?: string, b?: string) => (a || "").toLowerCase() === (b || "").toLowerCase();
const hex = (value: unknown) => typeof value === "string" && /^0x[a-fA-F0-9]*$/.test(value) ? value.toLowerCase() : "";

export async function verifyEscrowAction(rpc: Rpc, input: {
  kind: FujiKind;
  hash: string;
  asset: AssetConfig;
  order?: OrderTerms;
  deployment?: {contract: string; token: string; decimals: string; simulation: boolean} | null;
  allowLocalChain?: boolean;
}): Promise<Verdict> {
  const hash = hex(input.hash);
  const base: Verdict = {status: "rejected", reason: "", kind: input.kind, hash, businessId: "", simulation: input.asset.simulation, chainId: 0};
  if (!/^0x[a-f0-9]{64}$/.test(hash)) return {...base, reason: "Hash de transacción inválido."};
  if (!input.asset.ready || !input.asset.address || input.asset.decimals == null) return {...base, reason: input.asset.blocked || "El activo de Fuji no está configurado."};
  const chainHex = hex(await rpc("eth_chainId", []));
  const chainId = chainHex ? Number(BigInt(chainHex)) : 0;
  base.chainId = chainId;
  if (chainId === 43114) return {...base, reason: "Esta RPC es Avalanche mainnet. El escrow solo puede usar Fuji."};
  if (chainId !== 43113 && !input.allowLocalChain) return {...base, reason: "La red no es Avalanche Fuji C-Chain (43113)."};
  const tx = await rpc("eth_getTransactionByHash", [hash]) as Tx | null;
  if (!tx) return {...base, status: "pending", reason: "La transacción todavía no está en la red."};
  const receipt = await rpc("eth_getTransactionReceipt", [hash]) as Receipt | null;
  if (!receipt) return {...base, status: "pending", reason: "La transacción está pendiente: no hay recibo."};
  if (hex(receipt.status) === "0x0") return {...base, status: "failed", reason: "La transacción falló en la red. No se movió el estado financiero."};
  if (hex(receipt.status) !== "0x1") return {...base, reason: "El recibo no tiene un estado válido."};
  if (input.kind === "deployment") return verifyDeployment(rpc, base, input.asset, receipt, chainId);
  if (!input.order) return {...base, reason: "Orden no encontrada."};
  base.businessId = "";
  if (!input.deployment?.contract) return {...base, businessId: "", reason: "Falta un escrow verificado. Pegar una dirección no lo confirma."};
  if (!same(tx.to || "", input.deployment.contract)) return {...base, reason: "La transacción no apunta al escrow verificado."};
  if (input.kind === "fund") return verifyFund(base, input.order, input.asset, input.deployment.contract, tx, receipt);
  if (input.kind === "authorize") return verifyAuthorize(base, input.order, tx, receipt);
  if (input.kind === "settle") return verifySettle(rpc, base, input.order, input.deployment.contract, tx, receipt);
  return verifyRefund(rpc, base, input.order, input.deployment.contract, tx, receipt);
}

async function verifyDeployment(rpc: Rpc, base: Verdict, asset: AssetConfig, receipt: Receipt, chainId: number): Promise<Verdict> {
  const contract = hex(receipt.contractAddress);
  if (!/^0x[a-f0-9]{40}$/.test(contract)) return {...base, reason: "El recibo no crea un contrato."};
  const code = hex(await rpc("eth_getCode", [contract, "latest"]));
  if (!code || code === "0x") return {...base, reason: "El contrato no tiene código."};
  const [token, decimals, reportedChain] = await Promise.all([
    call(rpc, contract, "0x" + escrowSelectors.token),
    call(rpc, contract, "0x" + escrowSelectors.tokenDecimals),
    call(rpc, contract, "0x" + escrowSelectors.chainId),
  ]);
  if (!same(addressOf(wordsOf(token)[0] || ""), asset.address)) return {...base, reason: "El escrow no quedó atado al activo configurado."};
  if (Number(uintOf(wordsOf(decimals)[0] || "0")) !== asset.decimals) return {...base, reason: "Los decimales del escrow no coinciden con la configuración."};
  if (Number(uintOf(wordsOf(reportedChain)[0] || "0")) !== chainId) return {...base, reason: "El escrow informa otra red."};
  return {...base, status: "confirmed", reason: asset.simulation ? "Simulación local. No es USDT oficial ni evidencia de Fuji." : "Despliegue verificado contra el activo configurado.", contract, token: asset.address.toLowerCase(), decimals: String(asset.decimals), symbol: asset.symbol};
}

function verifyFund(base: Verdict, order: OrderTerms, asset: AssetConfig, contract: string, tx: Tx, receipt: Receipt): Verdict {
  if (!order.amount) return {...base, reason: "La orden no tiene importe porque el activo no estaba configurado."};
  let decoded;
  try { decoded = decodeFund(tx.input || ""); } catch (error) { return {...base, reason: error instanceof Error ? error.message : "Llamada inválida."}; }
  const funded = log(receipt, contract, escrowTopics.funded);
  const fundedTopics = funded?.topics ?? [];
  if (!funded || fundedTopics.length < 4) return {...base, reason: "El recibo no trae el evento de reserva del escrow."};
  const data = wordsOf(funded.data || "0x");
  const buyer = hex(tx.from);
  const fields = {
    orderId: fundedTopics[1], seller: addressOf(fundedTopics[3].slice(2).padStart(64, "0")),
    amount: uintOf(data[0] || "0").toString(), quantity: uintOf(data[1] || "0").toString(),
    unitPrice: uintOf(data[2] || "0").toString(), deadline: uintOf(data[3] || "0").toString(),
  };
  const matches = same(decoded.orderId, order.orderId) && same(fields.orderId, order.orderId)
    && same(decoded.seller, order.seller) && same(fields.seller, order.seller)
    && decoded.quantity.toString() === order.quantity && fields.quantity === order.quantity
    && decoded.unitPrice.toString() === order.unitPrice && fields.unitPrice === order.unitPrice
    && decoded.amount.toString() === order.amount && fields.amount === order.amount
    && decoded.deadline.toString() === order.deadline && fields.deadline === order.deadline
    && same(decoded.asset, asset.address) && same(decoded.asset, order.token)
    && same(addressOf(fundedTopics[2] || ""), buyer);
  if (!matches || !buyer) return {...base, reason: "El recibo no coincide con la orden, el activo o el importe."};
  return {...base, status: "confirmed", reason: asset.simulation ? "Simulación local. Reserva leída de un recibo local, no de USDT oficial." : "Reserva confirmada con el recibo de Fuji.", contract, token: asset.address.toLowerCase(), buyer, seller: order.seller, orderId: order.orderId, quantity: order.quantity, unitPrice: order.unitPrice, amount: order.amount, deadline: order.deadline};
}

function verifyAuthorize(base: Verdict, order: OrderTerms, tx: Tx, receipt: Receipt): Verdict {
  if (!order.buyer || !same(tx.from, order.buyer)) return {...base, reason: "Solo la wallet que bloqueó los fondos puede autorizar al empleado."};
  const event = log(receipt, order.contract, escrowTopics.authorized);
  const authorizedTopics = event?.topics ?? [];
  if (!event || authorizedTopics.length < 4 || !same(authorizedTopics[1], order.orderId)) return {...base, reason: "El recibo no autoriza a un empleado de esta orden."};
  const delegate = addressOf(authorizedTopics[3].slice(2).padStart(64, "0"));
  if (!delegate || same(delegate, order.seller) || /^0x0{40}$/.test(delegate)) return {...base, reason: "El delegado es inválido. El vendedor no puede autorizarse a cobrar."};
  return {...base, status: "confirmed", reason: "Empleado autorizado en el contrato. El formulario no alcanza.", delegate, buyer: order.buyer};
}

async function verifySettle(rpc: Rpc, base: Verdict, order: OrderTerms, contract: string, tx: Tx, receipt: Receipt): Promise<Verdict> {
  const event = log(receipt, contract, escrowTopics.settled);
  const settledTopics = event?.topics ?? [];
  if (!event || !same(settledTopics[1], order.orderId)) return {...base, reason: "El recibo no liquida esta orden."};
  const delegate = addressOf((settledTopics[2] || "").slice(2).padStart(64, "0"));
  if (!same(tx.from, delegate) || !order.delegate || !same(delegate, order.delegate)) return {...base, reason: "La liquidación no la firmó el empleado autorizado."};
  const data = wordsOf(event.data || "0x");
  const received = uintOf(data[0] || "0");
  const sellerAmount = uintOf(data[1] || "0");
  const buyerRefund = uintOf(data[2] || "0");
  let expected;
  try { expected = settlement(BigInt(order.amount), BigInt(order.quantity), received); } catch (error) { return {...base, reason: error instanceof Error ? error.message : "Recepción inválida."}; }
  if (sellerAmount !== expected.seller || buyerRefund !== expected.buyer || sellerAmount + buyerRefund !== BigInt(order.amount)) return {...base, reason: "Los importes del recibo no conservan el total."};
  const stored = wordsOf(await call(rpc, contract, "0x" + escrowSelectors.order + order.orderId.slice(2).padStart(64, "0")));
  if (Number(uintOf(stored[8] || "0")) !== 2) return {...base, reason: "El contrato no quedó cerrado."};
  return {...base, status: "confirmed", reason: order.simulation ? "Simulación local. Liquidación leída de un recibo local." : "Liquidación confirmada en un solo recibo.", received: received.toString(), sellerAmount: sellerAmount.toString(), buyerRefund: buyerRefund.toString(), delegate};
}

async function verifyRefund(rpc: Rpc, base: Verdict, order: OrderTerms, contract: string, tx: Tx, receipt: Receipt): Promise<Verdict> {
  void tx;
  const event = log(receipt, contract, escrowTopics.refunded);
  const refundTopics = event?.topics ?? [];
  if (!event || !same(refundTopics[1], order.orderId)) return {...base, reason: "El recibo no reembolsa esta orden."};
  const amount = uintOf(wordsOf(event.data || "0x")[0] || "0");
  if (amount.toString() !== order.amount) return {...base, reason: "El reembolso no es el total bloqueado."};
  const stored = wordsOf(await call(rpc, contract, "0x" + escrowSelectors.order + order.orderId.slice(2).padStart(64, "0")));
  if (Number(uintOf(stored[8] || "0")) !== 3 || uintOf(stored[7] || "0") !== BigInt(0)) return {...base, reason: "El contrato no quedó reembolsado sin recepción."};
  return {...base, status: "confirmed", reason: order.simulation ? "Simulación local. Reembolso leído de un recibo local." : "Reembolso total confirmado.", amount: amount.toString(), buyer: addressOf((refundTopics[2] || "").slice(2).padStart(64, "0"))};
}

function log(receipt: Receipt, contract: string, topic: string) {
  return (receipt.logs || []).find(item => same(item.address, contract) && same(item.topics?.[0], topic));
}

async function call(rpc: Rpc, to: string, data: string) {
  const result = hex(await rpc("eth_call", [{to, data}, "latest"]));
  if (!result || result === "0x") throw new Error("El contrato no respondió.");
  return result;
}
