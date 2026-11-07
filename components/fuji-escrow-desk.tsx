"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {refreshShared, sharedCommand, useShared, workspaceToken} from "./shared-demo";
import {escrowListLabel, type FujiEscrowRecord} from "../lib/fuji-escrow";
import {encodeApprove, encodeAuthorize, encodeDeploy, encodeFund, encodeRefund, encodeSettle} from "../lib/fuji-abi";
import {approveSteps} from "../lib/fuji-escrow";
import {canMoveOfficialFunds, type AssetConfig} from "../lib/fuji-asset";
import type {SharedOrder} from "../lib/demo-model";

type CoreProvider = {request(args: {method: string; params?: unknown[]}): Promise<unknown>; on?(event: string, listener: () => void): void};
type AssetResponse = AssetConfig & {chainId: number};
const fujiChain = "0xa869";

function endpoint() {
  const demo = process.env.NEXT_PUBLIC_OC_SHARED_API || "https://obra-clara-api.obra-clara.workers.dev/api/demo";
  return new URL(demo).origin + "/api/fuji-escrow";
}
function core() {
  return (window as Window & {avalanche?: CoreProvider}).avalanche;
}

export function FujiEscrowBoard({role, focus}: {role: "Compras" | "Ventas"; focus?: string}) {
  const {state} = useShared();
  const orders = (state?.orders ?? []).filter(order => order.escrow && (!focus || order.id === focus));
  return <section className="fuji-wallet panel" aria-label="Compra de cemento en Fuji">
    <span className="fn-eyebrow">USDT EN FUJI · NO ES EL REGISTRO ARGt</span>
    <h2>Compra de 100 bolsas</h2>
    <p>El guion es 100 bolsas de 50 kg, 5 USDT de prueba, 80 recibidas, 4 para el vendedor y 1 devuelto. Esos números no son un saldo hasta que el backend lea un recibo exitoso. Despachar no libera fondos. Anotar una recepción no liquida.</p>
    <FujiDeploy/>
    {!orders.length && <p>Todavía no hay una orden de cemento en este espacio. Se crea desde el carrito, no desde este panel.</p>}
    {orders.map(order => <FujiOrderCard key={order.id} order={order} role={role}/>)}
  </section>;
}

function FujiOrderCard({order, role}: {order: SharedOrder; role: "Compras" | "Ventas"}) {
  const escrow = order.escrow as FujiEscrowRecord;
  const [asset, setAsset] = useState<AssetResponse>();
  const [deployment, setDeployment] = useState("");
  const [account, setAccount] = useState("");
  const [chain, setChain] = useState("");
  const [delegate, setDelegate] = useState("");
  const [hash, setHash] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const official = !!asset && canMoveOfficialFunds(asset);
  const contract = deployment || escrow.contract;

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(endpoint(), {headers: {Authorization: "Bearer " + workspaceToken()}, cache: "no-store"});
        const data = await response.json();
        if (!active) return;
        setAsset(data.asset);
        setDeployment(data.deployment?.contract || "");
      } catch {
        if (active) setMessage("No se pudo leer el estado del activo en el backend.");
      }
    };
    void load();
    const provider = core();
    const sync = async () => {
      if (!provider) { setAccount(""); setChain(""); return; }
      try {
        const [accounts, chainId] = await Promise.all([
          provider.request({method: "eth_accounts"}),
          provider.request({method: "eth_chainId"}),
        ]);
        const next = Array.isArray(accounts) ? String(accounts[0] || "") : "";
        setAccount(/^0x[a-fA-F0-9]{40}$/.test(next) ? next : "");
        setChain(String(chainId || "").toLowerCase());
      } catch { setAccount(""); setChain(""); }
    };
    void sync();
    provider?.on?.("accountsChanged", () => void sync());
    provider?.on?.("chainChanged", () => void sync());
    provider?.on?.("disconnect", () => { setAccount(""); setChain(""); });
    window.addEventListener("focus", () => void sync());
    return () => { active = false; };
  }, [order.id]);

  async function verify(kind: "deployment" | "fund" | "authorize" | "settle" | "refund", txHash: string) {
    const response = await fetch(endpoint(), {method: "POST", headers: {Authorization: "Bearer " + workspaceToken(), "Content-Type": "application/json"}, body: JSON.stringify({action: "verify", orderId: order.id, txHash, kind})});
    const data = await response.json();
    if (!response.ok || data.verdict?.status === "rejected" || data.verdict?.status === "failed") throw new Error(data.error || data.verdict?.reason || "La verificación no pasó.");
    await refreshShared();
    return data.verdict as {status: string; reason: string};
  }

  async function send(to: string, data: string) {
    const provider = core();
    if (!provider) throw new Error("Abrí Chrome con Core. Esta pantalla no firma sola.");
    if (chain !== fujiChain) throw new Error("Cambiá Core a Avalanche Fuji C-Chain.");
    if (!official || asset?.simulation) throw new Error(asset?.blocked || "USDT de Fuji no está confirmado. No se envía la transacción.");
    const tx = await provider.request({method: "eth_sendTransaction", params: [{from: account, to, data}]}) as string;
    setHash(tx);
    return tx;
  }

  async function fund() {
    if (!contract || !asset?.address || asset.decimals == null || !escrow.amount) throw new Error("Falta el escrow verificado o el importe del activo.");
    const allowanceData = "0xdd62ed3e" + account.slice(2).padStart(64, "0") + contract.slice(2).padStart(64, "0");
    const rawAllowance = String(await core()?.request({method: "eth_call", params: [{to: asset.address, data: allowanceData}, "latest"]}) ?? "0x0");
    const allowance = BigInt(rawAllowance === "0x" ? "0x0" : rawAllowance);
    for (const amount of approveSteps(allowance, BigInt(escrow.amount))) {
      await send(asset.address, encodeApprove(contract, amount));
    }
    const tx = await send(contract, encodeFund({orderId: escrow.orderId, seller: escrow.seller, quantity: BigInt(escrow.quantity), unitPrice: BigInt(escrow.unitPrice), amount: BigInt(escrow.amount), deadline: BigInt(escrow.deadline), asset: asset.address}));
    return verify("fund", tx);
  }

  async function run(action: () => Promise<{status: string; reason: string} | void>) {
    setBusy(true); setMessage("");
    try { const result = await action(); setMessage(result ? result.reason : "Listo."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo completar."); }
    finally { setBusy(false); }
  }

  const closed = escrow.phase === "liquidada" || escrow.phase === "reembolsada";
  return <article>
    <p><strong>{order.id}</strong> · {order.lines[0]?.quantity ?? 100} × {order.lines[0]?.name}</p>
    <p>Estado logístico compartido: {order.status}</p>
    <p>Estado financiero: {escrowListLabel(escrow, order.status)}</p>
    <p>{asset?.blocked || (official ? "Activo configurado. Las firmas las hace Core." : "Transacciones reales bloqueadas.")} {asset?.simulation ? "Simulación local: no es USDT oficial." : ""}</p>
    <p>Vendedor {escrow.seller || "sin dirección"} · Empleado {escrow.delegate || "sin autorización on-chain"} · Contrato {contract || "sin escrow verificado"}</p>
    <p><Link href={"/recepcion/" + order.id}>Comprobante de la orden</Link>. El enlace no autoriza fondos.</p>
    <button className="button secondary" type="button" onClick={() => window.print()}>Imprimir comprobante</button>
    {role === "Ventas" && <button className="button primary" disabled={busy || escrow.phase !== "reservada" || order.status === "Despachada"} onClick={() => void run(async () => { await sharedCommand("fuji.dispatch", {orderId: order.id}); setMessage("Despacho registrado. No se liberaron fondos."); })}>Registrar despacho sin cobro</button>}
    {role === "Compras" && !closed && <>
      <label>Wallet del empleado<input value={delegate} onChange={event => setDelegate(event.target.value)} placeholder="0x… la carga el comprador, no se inventa"/></label>
      <button className="button primary" disabled={busy || !official || !contract || escrow.phase === "reservada"} onClick={() => void run(() => fund())}>Firmar reserva con Core</button>
      <button className="button secondary" disabled={busy || !official || escrow.phase !== "reservada" || !/^0x[a-fA-F0-9]{40}$/.test(delegate)} onClick={() => void run(async () => verify("authorize", await send(contract, encodeAuthorize(escrow.orderId, delegate))))}>Autorizar empleado</button>
      <button className="button secondary" disabled={busy || !official || order.status !== "Despachada" || !escrow.delegate} onClick={() => void run(async () => verify("settle", await send(contract, encodeSettle(escrow.orderId, 80n))))}>Empleado firma 80 recibidas</button>
      {escrow.mode === "expiry" && <button className="button secondary" disabled={busy || !official || escrow.phase !== "reservada"} onClick={() => void run(async () => verify("refund", await send(contract, encodeRefund(escrow.orderId))))}>Reembolsar total vencido</button>}
    </>}
    <label>Reintentar un hash ya enviado<input value={hash} onChange={event => setHash(event.target.value)} placeholder="0x…"/></label>
    <button className="button secondary" disabled={busy || !/^0x[a-fA-F0-9]{64}$/.test(hash)} onClick={() => void run(() => verify(escrow.phase === "reservada" && order.status === "Despachada" ? "settle" : "fund", hash))}>Verificar de nuevo</button>
    {message && <p role="status">{message}</p>}
    {!account && <p>Core: sin vincular en este navegador.</p>}
    {account && chain !== fujiChain && <p>Core está en otra red. Hace falta Fuji.</p>}
  </article>;
}

function FujiDeploy() {
  const [asset, setAsset] = useState<AssetResponse>();
  const [account, setAccount] = useState("");
  const [chain, setChain] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const official = !!asset && canMoveOfficialFunds(asset);
  useEffect(() => {
    let active = true;
    void fetch(endpoint(), {headers: {Authorization: "Bearer " + workspaceToken()}, cache: "no-store"}).then(async response => {
      const data = await response.json();
      if (active) setAsset(data.asset);
    }).catch(() => { if (active) setMessage("No se pudo consultar si el activo ya está habilitado."); });
    const provider = core();
    const sync = async () => {
      if (!provider) { setAccount(""); setChain(""); return; }
      try {
        const [accounts, chainId] = await Promise.all([provider.request({method: "eth_accounts"}), provider.request({method: "eth_chainId"})]);
        const next = Array.isArray(accounts) ? String(accounts[0] || "") : "";
        setAccount(/^0x[a-fA-F0-9]{40}$/.test(next) ? next : "");
        setChain(String(chainId || "").toLowerCase());
      } catch { setAccount(""); setChain(""); }
    };
    void sync();
    return () => { active = false; };
  }, []);
  async function deploy() {
    if (!official || !asset?.address || asset.decimals == null) throw new Error(asset?.blocked || "USDT de Fuji no está confirmado. No se envía el despliegue.");
    const provider = core();
    if (!provider || !account) throw new Error("Abrí Chrome con Core y conectá la cuenta.");
    if (chain !== fujiChain) throw new Error("Cambiá Core a Avalanche Fuji C-Chain.");
    const artifact = await import("../lib/fuji-escrow-artifact.json");
    const data = encodeDeploy(artifact.bytecode, asset.address, asset.decimals, 43113n);
    const tx = await provider.request({method: "eth_sendTransaction", params: [{from: account, data}]}) as string;
    const response = await fetch(endpoint(), {method: "POST", headers: {Authorization: "Bearer " + workspaceToken(), "Content-Type": "application/json"}, body: JSON.stringify({action: "verify", txHash: tx, kind: "deployment"})});
    const body = await response.json();
    if (!response.ok || body.verdict?.status !== "confirmed") throw new Error(body.error || body.verdict?.reason || "El despliegue no quedó verificado.");
    await refreshShared();
    const contract = body.deployment?.contract as string;
    return {status: "confirmed", reason: `Contrato verificado por el backend: ${contract}. En el explorador de Fuji abrí esa dirección y publicá el código con el archivo contracts/VERIFY.md.`};
  }
  return <div>
    <h3>Despliegue del escrow</h3>
    <p>El botón arma la transacción de creación y la firma Core. Esta pantalla no tiene una clave y no despliega sola. Mientras falte el USDT de Fuji, el botón queda apagado.</p>
    <button className="button primary" type="button" disabled={busy || !official} onClick={() => {
      setBusy(true); setMessage("");
      deploy().then(result => setMessage(result.reason)).catch(error => setMessage(error instanceof Error ? error.message : "No se pudo firmar el despliegue.")).finally(() => setBusy(false));
    }}>Firmar despliegue con Core</button>
    <p>Para verificar en el explorador: compilador 0.8.28, optimizador activo, 200 corridas, archivos ObraClaraPartialEscrow.sol y SafeERC20.sol. Los argumentos son el token configurado, sus decimales y 43113. La guía está en contracts/VERIFY.md.</p>
    {message && <p role="status">{message}</p>}
  </div>;
}
