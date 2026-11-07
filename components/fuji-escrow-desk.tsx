"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {EscrowReception, type ReceptionEvidence} from "./escrow-reception";
import {refreshShared, sharedCommand, useShared, workspaceToken} from "./shared-demo";
import {escrowListLabel, type FujiDeployment, type FujiEscrowRecord} from "../lib/fuji-escrow";
import {encodeApprove, encodeAuthorize, encodeDeploy, encodeFund, encodeRefund, encodeSettle} from "../lib/fuji-abi";
import {approveSteps} from "../lib/fuji-escrow";
import {ARBITRUM_CHAIN_ID, AVALANCHE_ARGT, AVALANCHE_CHAIN_ID, TWIN_ADAPTER, TWIN_ARGT_ARBITRUM, canMoveOfficialFunds, type AssetConfig} from "../lib/fuji-asset";
import type {SharedOrder} from "../lib/demo-model";
import {BuyerIdentity} from "./buyer-identity";
import {verifiedArgtBalanceWallet} from "../lib/buyer-profile";

type CoreProvider = {request(args: {method: string; params?: unknown[]}): Promise<unknown>; on?(event: string, listener: () => void): void; removeListener?(event: string, listener: () => void): void};
type AssetResponse = AssetConfig;
function expectedChain(asset?: {chainId?: number}) {
  return "0x" + (asset?.chainId || 43113).toString(16);
}

function endpoint() {
  const demo = process.env.NEXT_PUBLIC_OC_SHARED_API || "https://obra-clara-api.obra-clara.workers.dev/api/demo";
  return new URL(demo).origin + "/api/fuji-escrow";
}
function core() {
  return (window as Window & {avalanche?: CoreProvider}).avalanche;
}
const DEPLOYMENT_EVENT = "oc-fuji-deployment";
function pendingDeployKey() {
  return "oc-fuji-pending-deploy:" + workspaceToken();
}
function readPendingDeploy() {
  try {
    const value = localStorage.getItem(pendingDeployKey()) || "";
    return /^0x[a-fA-F0-9]{64}$/.test(value) ? value : "";
  } catch { return ""; }
}
function writePendingDeploy(hash: string) {
  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) return;
  localStorage.setItem(pendingDeployKey(), hash);
}
function asDeployment(value: unknown): FujiDeployment | null {
  if (!value || typeof value !== "object") return null;
  const item = value as FujiDeployment;
  return /^0x[a-fA-F0-9]{40}$/.test(item.contract || "") ? item : null;
}

export function FujiEscrowBoard({role, focus}: {role: "Compras" | "Ventas"; focus?: string}) {
  const {state, ready} = useShared();
  const [asset, setAsset] = useState<AssetResponse>();
  const [recordedContract, setRecordedContract] = useState("");
  const orders = (state?.orders ?? []).filter(order => order.escrow && (!focus || order.id.toLowerCase() === focus.toLowerCase()));
  useEffect(() => {
    let active = true;
    const load = () => fetch(endpoint(), {headers: {Authorization: "Bearer " + workspaceToken()}, cache: "no-store"}).then(async response => {
      const data = await response.json();
      if (!active) return;
      setAsset(data.asset);
      setRecordedContract(asDeployment(data.deployment)?.contract || "");
    }).catch(() => undefined);
    void load();
    window.addEventListener(DEPLOYMENT_EVENT, load);
    return () => { active = false; window.removeEventListener(DEPLOYMENT_EVENT, load); };
  }, []);
  if (focus && role === "Compras") return <section className="oc-receipt-page">
    <Link href="/compras" className="oc-receipt-back">← Volver a Compras</Link>
    {orders.length ? orders.map(order => <FujiOrderCard key={order.id} order={order} role={role} receptionPage/>) : <p>{ready ? "Abrí este enlace en el navegador donde hiciste la compra." : "Cargando orden…"}</p>}
  </section>;
  const argt = asset?.symbol === "ARGt";
  const railLive = argt && !!asset?.enabled && !asset.simulation;
  return <section className="fuji-wallet panel" aria-label={argt ? "Compra de cemento en ARGt" : "Compra de cemento en Fuji"}>
    <div className="oc-escrow-heading"><h2>Compras con fondos protegidos</h2><p>Seguí la reserva, el despacho y la recepción de cada orden.</p></div>
    <details className="oc-escrow-details">
      <summary>Configuración de billetera y contrato</summary>
      <p>{railLive ? recordedContract ? "Avalanche C-Chain · Contrato verificado" : "Avalanche C-Chain · Contrato pendiente" : "Riel de prueba"}</p>
      <BuyerIdentity/>
      {argt && <AcquisitionSteps/>}
      <FujiDeploy/>
    </details>
    {!orders.length && <p>Todavía no hay una orden de cemento en este espacio. Se crea desde el carrito, no desde este panel.</p>}
    {orders.map(order => <FujiOrderCard key={order.id} order={order} role={role}/>)}
  </section>;
}

export function EscrowPurchaseNote() {
  const [asset, setAsset] = useState<AssetResponse>();
  useEffect(() => {
    let active = true;
    void fetch(endpoint(), {headers: {Authorization: "Bearer " + workspaceToken()}, cache: "no-store"}).then(async response => {
      const data = await response.json();
      if (active) setAsset(data.asset);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  if (asset?.symbol === "ARGt" && asset.enabled && !asset.simulation) return <p className="escrow-sim-banner">Riel ARGt habilitado. Cada bolsa de la demo cuesta 0,05 ARGt. El escrow reserva 5 ARGt por 100 bolsas. Con 80 recibidas se pagan 4 ARGt y se devuelve 1. Agregar al carrito no reserva.</p>;
  if (asset?.symbol === "ARGt") return <p className="escrow-sim-banner">SIMULACIÓN. 100 bolsas bloquean 5 ARGt, token de pesos, no USD ni USDT. 80 recibidas pagan 4 ARGt y devuelven 1 ARGt. El polvo de la wallet no se suma. Agregar al carrito no reserva.</p>;
  return <p>100 bolsas de Cemento Portland Loma Negra, Corralón Norte. El precio de catálogo es una demostración. El riel Fuji, si aparece, no es esta compra en ARGt y no queda reservado al agregar al carrito.</p>;
}

function AcquisitionSteps() {
  const [hash, setHash] = useState("");
  const [chain, setChain] = useState(String(ARBITRUM_CHAIN_ID));
  const [note, setNote] = useState("");
  return <div>
    <h3>Cómo conseguir el ARGt y el gas</h3>
    <p>Estos pasos no prueban el escrow. El escrow solo cuenta un recibo de Avalanche sobre el contrato propio.</p>
    <ol>
      <li>ETH en Arbitrum (42161) reservado para el gas de esa red.</li>
      <li>Del ETH restante, el camino acordado es ETH, luego USDt0, luego ARGt en Arbitrum <a href={"https://arbiscan.io/token/" + TWIN_ARGT_ARBITRUM} target="_blank" rel="noreferrer">{TWIN_ARGT_ARBITRUM}</a>, y el bridge Twin con el adapter <a href={"https://arbiscan.io/address/" + TWIN_ADAPTER} target="_blank" rel="noreferrer">{TWIN_ADAPTER}</a> también en Avalanche. No hay un swap integrado acá.</li>
      <li>Otra parte del ETH va a AVAX nativo, no a WAVAX, por <a href="https://app.across.to/" target="_blank" rel="noreferrer">Across</a>. Snapshot 11:30 ART del 7 nov 2026, no revalidado: 0,001 ETH ≈ 0,262 AVAX, fee 0,08 USD. La ejecución de ese puente no está probada.</li>
    </ol>
    <p>ARGt que el escrow puede bloquear en Avalanche: <a href={"https://subnets.avax.network/c-chain/address/" + AVALANCHE_ARGT} target="_blank" rel="noreferrer">{AVALANCHE_ARGT}</a>, 18 decimales, red {AVALANCHE_CHAIN_ID}.</p>
    <label>Hash de adquisición, solo si una RPC lo devuelve
      <input value={hash} onChange={event => setHash(event.target.value)} placeholder="0x…"/>
    </label>
    <label>Red del hash
      <select value={chain} onChange={event => setChain(event.target.value)}>
        <option value={String(ARBITRUM_CHAIN_ID)}>Arbitrum 42161</option>
        <option value={String(AVALANCHE_CHAIN_ID)}>Avalanche 43114</option>
      </select>
    </label>
    <button className="button secondary" type="button" disabled={!/^0x[a-fA-F0-9]{64}$/.test(hash)} onClick={() => void fetch(endpoint(), {method: "POST", headers: {Authorization: "Bearer " + workspaceToken(), "Content-Type": "application/json"}, body: JSON.stringify({action: "track", txHash: hash, chainId: Number(chain)})}).then(async response => setNote((await response.json()).reason || "Sin respuesta.")).catch(() => setNote("No se pudo consultar la RPC."))}>Consultar hash</button>
    {note && <p role="status">{note}</p>}
  </div>;
}

function FujiOrderCard({order, role, receptionPage}: {order: SharedOrder; role: "Compras" | "Ventas"; receptionPage?: boolean}) {
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

  async function verify(kind: "deployment" | "fund" | "authorize" | "settle" | "refund", txHash: string, reception?: ReceptionEvidence) {
    const response = await fetch(endpoint(), {method: "POST", headers: {Authorization: "Bearer " + workspaceToken(), "Content-Type": "application/json"}, body: JSON.stringify({action: "verify", orderId: order.id, txHash, kind, reception})});
    const data = await response.json();
    if (!response.ok || data.verdict?.status === "rejected" || data.verdict?.status === "failed") throw new Error(data.error || data.verdict?.reason || "La verificación no pasó.");
    await refreshShared();
    if (kind === "fund" && data.verdict?.status === "confirmed" && data.email) {
      const mail = data.email === "enviado" ? " Comprobante enviado." : " No se pudo enviar el comprobante: " + data.email + ".";
      return {status: data.verdict.status, reason: data.verdict.reason + mail};
    }
    return data.verdict as {status: string; reason: string};
  }

  async function send(to: string, data: string) {
    const provider = core();
    if (!provider) throw new Error("Abrí Chrome con Core. Esta pantalla no firma sola.");
    if (chain !== expectedChain(asset)) throw new Error(asset?.symbol === "ARGt" ? "Core está en otra red. Hace falta Avalanche C-Chain (43114). No se agrega el token solo." : "Cambiá Core a Avalanche Fuji C-Chain.");
    if (!official || asset?.simulation) throw new Error(asset?.blocked || "El activo no está habilitado. No se envía la transacción.");
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
    return submit("fund", tx);
  }

  async function run(action: () => Promise<{status: string; reason: string} | void>) {
    setBusy(true); setMessage("");
    try { const result = await action(); setMessage(result ? result.reason : "Listo."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo completar."); }
    finally { setBusy(false); }
  }

  const [pendingAction, setPendingAction] = useState<{kind: "fund" | "authorize" | "settle" | "refund"; hash: string; reception?: ReceptionEvidence}>();
  async function submit(kind: "fund" | "authorize" | "settle" | "refund", txHash: string, reception?: ReceptionEvidence) {
    setPendingAction({kind, hash: txHash, reception});
    let result = await verify(kind, txHash, reception);
    for (let attempt = 0; attempt < 5 && result.status === "pending"; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      result = await verify(kind, txHash, reception);
    }
    return result;
  }
  const closed = escrow.phase === "liquidada" || escrow.phase === "reembolsada";
  const canDispatch = escrow.phase === "reservada" && order.status !== "Despachada";
  const funded = escrow.attempts.some(attempt => attempt.kind === "fund" && attempt.status === "confirmed");
  const reserved = escrow.phase === "reservada";
  const dispatched = !!escrow.dispatchedAt;
  const settled = escrow.phase === "liquidada";
  const rightWallet = !!account && account.toLowerCase() === escrow.delegate.toLowerCase();
  const rightNetwork = chain === expectedChain(asset);
  const walletNotice = !escrow.delegate ? "Autorizá la wallet receptora desde el seguimiento de la orden."
    : account && !rightWallet ? "Seleccioná la wallet receptora autorizada en Core."
    : account && !rightNetwork ? "Seleccioná Avalanche C-Chain en Core."
    : undefined;
  async function connectWallet() {
    const provider = core();
    if (!provider) throw new Error("Abrí Chrome con Core.");
    const accounts = await provider.request({method: "eth_accounts"});
    if (!Array.isArray(accounts) || !accounts.length) await provider.request({method: "eth_requestAccounts"});
    const connected = await provider.request({method: "eth_accounts"});
    setAccount(Array.isArray(connected) ? String(connected[0] || "") : "");
    setChain(String(await provider.request({method: "eth_chainId"})).toLowerCase());
  }
  return <article className="oc-escrow-order">
    <header className="oc-escrow-order-head">
      <div><span className="fn-eyebrow">{order.project.name}</span>
        <h2>{receptionPage ? "Recepción de mercadería" : order.lines[0]?.name}</h2>
        <p>{receptionPage && <>{order.lines[0]?.name} · </>}{order.supplier} · {escrow.quantity} bolsas</p>
      </div>
      <span className="oc-escrow-status">{order.status}</span>
    </header>
    <ol className="oc-escrow-steps" aria-label="Seguimiento de la orden">
      <li data-done={funded}>1. Fondos reservados</li>
      <li data-done={dispatched}>2. Despacho</li>
      <li data-done={settled}>3. Recepción y pago</li>
    </ol>
    <p className="oc-escrow-balance">{escrowListLabel(escrow, order.status)}</p>
    {receptionPage && order.status === "Pendiente" && <p>La recepción se habilita cuando el proveedor registra el despacho.</p>}
    {receptionPage && escrow.phase === "reservada" && Date.now() >= Number(escrow.deadline) * 1000 && <p>El plazo para confirmar esta recepción venció.</p>}
    {escrow.phase === "liquidada" && escrow.reception && <details><summary>Remito firmado</summary><p>{escrow.reception.name} · {escrow.reception.quantity} bolsas</p><img src={escrow.reception.signature} alt="Firma del responsable de recepción" width={240}/></details>}
    <div className="oc-escrow-actions">
    {!receptionPage && (role === "Ventas" || role === "Compras") && canDispatch &&
      <button className="button primary" disabled={busy} onClick={() => void run(async () => {
        await sharedCommand("fuji.dispatch", {orderId: order.id});
        setMessage("Despacho registrado.");
      })}>{role === "Compras" ? "Simular despacho del proveedor" : "Registrar despacho"}</button>}
    {role === "Compras" && !closed && <>
      {!funded && <button className="button primary" disabled={busy || !official || !contract || escrow.phase === "reserva pendiente"} onClick={() => void run(() => fund())}>Firmar reserva con Core</button>}
      {reserved && !escrow.delegate && <button className="button secondary" disabled={busy || !official || !escrow.buyer || account.toLowerCase() !== escrow.buyer.toLowerCase()} onClick={() => void run(async () =>
        submit("authorize", await send(contract, encodeAuthorize(escrow.orderId, escrow.buyer))))}>Autorizar mi wallet para recibir</button>}
      {reserved && dispatched && !receptionPage && <Link className="button secondary" href={"/recepcion/" + order.id}>Abrir recepción</Link>}
      {receptionPage && order.status === "Despachada" && escrow.phase === "reservada" && Date.now() < Number(escrow.deadline) * 1000 &&
        <EscrowReception order={order} autoOpen={!!escrow.delegate} ready={!busy && official && rightWallet && rightNetwork}
          walletNotice={walletNotice}
          connect={!account && escrow.delegate ? () => void run(connectWallet) : undefined}
          onConfirm={evidence => void run(async () => {
            const tx = await send(contract, encodeSettle(escrow.orderId, BigInt(evidence.quantity)));
            return submit("settle", tx, evidence);
          })}/>}
      {escrow.mode === "expiry" && <button className="button secondary" disabled={busy || !official || escrow.phase !== "reservada"} onClick={() => void run(async () => submit("refund", await send(contract, encodeRefund(escrow.orderId))))}>Reembolsar total vencido</button>}
    </>}
    {role === "Compras" && !account && <button className="button secondary" onClick={() => void run(connectWallet)}>Conectar Core</button>}
    {hash && <button className="button secondary" disabled={busy || !/^0x[a-fA-F0-9]{64}$/.test(hash)} onClick={() => void run(() => verify(pendingAction?.hash === hash ? pendingAction.kind : escrow.attempts.find(attempt => attempt.hash === hash)?.kind ?? (reserved && !escrow.delegate ? "authorize" : "fund"), hash, pendingAction?.hash === hash ? pendingAction.reception : undefined))}>Actualizar confirmación</button>}
    </div>
    <details className="oc-escrow-details"><summary>Detalles de la orden</summary>
    <p className="oc-escrow-id">{order.id}</p>
    <p>Wallet del proveedor <code>{escrow.seller}</code></p>
    <p>Contrato <code>{contract}</code></p>
    {role === "Compras" && reserved && !escrow.delegate && <div className="oc-escrow-actions">
      <label>Otra wallet receptora<input value={delegate} onChange={event => setDelegate(event.target.value)} placeholder="0x…"/></label>
      <button className="button secondary" disabled={busy || !official || !/^0x[a-fA-F0-9]{40}$/.test(delegate)} onClick={() => void run(async () => submit("authorize", await send(contract, encodeAuthorize(escrow.orderId, delegate))))}>Autorizar otra wallet</button>
    </div>}
    <label>Reintentar un hash ya enviado<input value={hash} onChange={event => setHash(event.target.value)} placeholder="0x…"/></label>
    <button className="button secondary" disabled={busy || !/^0x[a-fA-F0-9]{64}$/.test(hash)} onClick={() => void run(() => verify(pendingAction?.hash === hash ? pendingAction.kind : escrow.attempts.find(attempt => attempt.hash === hash)?.kind ?? (reserved && !escrow.delegate ? "authorize" : "fund"), hash, pendingAction?.hash === hash ? pendingAction.reception : undefined))}>Verificar de nuevo</button>
    </details>
    {message && <p role="status">{message}</p>}
    {!account && <p>Core: sin vincular en este navegador. Esta pantalla no agrega el token ni cambia de red sola.</p>}
    {account && chain !== expectedChain(asset) && <p>{asset?.symbol === "ARGt" ? "Core está en otra red. Hace falta Avalanche C-Chain (43114)." : "Core está en otra red. Hace falta Fuji."}</p>}
  </article>;
}

function FujiDeploy() {
  const [asset, setAsset] = useState<AssetResponse>();
  const [recorded, setRecorded] = useState<FujiDeployment | null>(null);
  const [sentHash, setSentHash] = useState("");
  const [account, setAccount] = useState("");
  const [chain, setChain] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const official = !!asset && canMoveOfficialFunds(asset);
  function remember(accounts: unknown, chainId: unknown) {
    const list = Array.isArray(accounts) ? accounts.map(item => String(item)) : [];
    const verified = list.find(item => item.toLowerCase() === verifiedArgtBalanceWallet.toLowerCase());
    const next = verified || list[0] || "";
    setAccount(/^0x[a-fA-F0-9]{40}$/.test(next) ? next : "");
    setChain(String(chainId || "").toLowerCase());
  }
  useEffect(() => {
    let active = true;
    const saved = readPendingDeploy();
    if (saved) setSentHash(saved);
    const load = () => fetch(endpoint(), {headers: {Authorization: "Bearer " + workspaceToken()}, cache: "no-store"}).then(async response => {
      const data = await response.json();
      if (!active) return;
      setAsset(data.asset);
      const found = asDeployment(data.deployment);
      if (found) setRecorded(found);
    }).catch(() => { if (active) setMessage("No se pudo consultar si el activo ya está habilitado."); });
    void load();
    window.addEventListener(DEPLOYMENT_EVENT, load);
    const provider = core();
    const sync = async () => {
      if (!provider) { setAccount(""); setChain(""); return; }
      try {
        const [accounts, chainId] = await Promise.all([provider.request({method: "eth_accounts"}), provider.request({method: "eth_chainId"})]);
        if (active) remember(accounts, chainId);
      } catch { if (active) { setAccount(""); setChain(""); } }
    };
    void sync();
    provider?.on?.("accountsChanged", sync);
    provider?.on?.("chainChanged", sync);
    return () => {
      active = false;
      window.removeEventListener(DEPLOYMENT_EVENT, load);
      provider?.removeListener?.("accountsChanged", sync);
      provider?.removeListener?.("chainChanged", sync);
    };
  }, []);
  async function consult(txHash: string) {
    const hash = txHash.trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) throw new Error("El hash no tiene el formato de una transacción.");
    writePendingDeploy(hash);
    setSentHash(hash);
    const response = await fetch(endpoint(), {method: "POST", headers: {Authorization: "Bearer " + workspaceToken(), "Content-Type": "application/json"}, body: JSON.stringify({action: "verify", txHash: hash, kind: "deployment"})});
    const body = await response.json();
    const found = asDeployment(body.deployment);
    if (found) {
      setRecorded(found);
      window.dispatchEvent(new Event(DEPLOYMENT_EVENT));
    }
    if (!response.ok) throw new Error(body.error || body.verdict?.reason || "No se pudo consultar el despliegue.");
    if (body.verdict?.status === "pending") {
      const reason = body.verdict.reason || "La transacción todavía no está en la red.";
      return {status: "pending", reason: reason + " El hash quedó guardado en este navegador. Consultar despliegue no vuelve a firmar."};
    }
    if (body.verdict?.status !== "confirmed") throw new Error(body.error || body.verdict?.reason || "El despliegue no quedó verificado.");
    await refreshShared();
    const contract = found?.contract || "";
    const network = asset?.symbol === "ARGt" ? "Avalanche C-Chain" : "Fuji";
    return {status: "confirmed", reason: `Contrato verificado por el backend: ${contract}. En el explorador de ${network} abrí esa dirección y publicá el código con el archivo contracts/VERIFY.md.`};
  }
  async function connectCore() {
    const provider = core();
    if (!provider) {
      setMessage("Abrí esta página en Chrome con la extensión Core. Esta pantalla no tiene una clave.");
      return;
    }
    if (!asset?.chainId) {
      setMessage("Todavía no se leyó el riel. Recargá la página. No se cambió de red ni se desplegó.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const accounts = await provider.request({method: "eth_requestAccounts"});
      let chainId = String(await provider.request({method: "eth_chainId"}) || "");
      const wanted = expectedChain(asset);
      if (asset && chainId.toLowerCase() !== wanted) {
        try {
          await provider.request({method: "wallet_switchEthereumChain", params: [{chainId: wanted}]});
        } catch (error) {
          const code = typeof error === "object" && error && "code" in error ? Number(error.code) : 0;
          if (code === 4001) throw new Error("Core no cambió de red. Elegí Avalanche C-Chain (43114).");
          if (wanted !== "0xa86a") throw error;
          await provider.request({method: "wallet_addEthereumChain", params: [{chainId: "0xa86a", chainName: "Avalanche C-Chain", nativeCurrency: {name: "Avalanche", symbol: "AVAX", decimals: 18}, rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"], blockExplorerUrls: ["https://snowtrace.io/"]}]});
        }
        chainId = String(await provider.request({method: "eth_chainId"}) || "");
      }
      remember(accounts, chainId);
      if (asset && chainId.toLowerCase() !== wanted) setMessage("Core sigue en otra red. En la ventana de Core elegí Avalanche C-Chain (43114). No se envió el despliegue.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Core no completó la conexión. No se envió el despliegue.");
    } finally {
      setBusy(false);
    }
  }
  async function deploy() {
    if (recorded?.contract) throw new Error("Este espacio ya tiene un escrow verificado. No se envía otro despliegue.");
    if (!official || !asset?.address || asset.decimals == null) throw new Error(asset?.blocked || "El activo no está habilitado. No se envía el despliegue.");
    const provider = core();
    if (!provider || !account) throw new Error("Abrí Chrome con Core y conectá la cuenta.");
    if (chain !== expectedChain(asset)) throw new Error(asset.symbol === "ARGt" ? "Core está en otra red. Hace falta Avalanche C-Chain (43114)." : "Cambiá Core a Avalanche Fuji C-Chain.");
    const artifact = await import("../lib/fuji-escrow-artifact.json");
    const data = encodeDeploy(artifact.bytecode, asset.address, asset.decimals, BigInt(asset.chainId));
    const tx = await provider.request({method: "eth_sendTransaction", params: [{from: account, data}]}) as string;
    writePendingDeploy(tx);
    setSentHash(tx);
    return consult(tx);
  }
  const onRail = !!asset && chain === expectedChain(asset);
  const sameVerified = account.toLowerCase() === verifiedArgtBalanceWallet.toLowerCase();
  return <div>
    <h3>Despliegue del escrow</h3>
    <p>El constructor solo recibe el token ARGt, 18 decimales y la cadena 43114. No pide vendedor, empleado ni orden. Lo firma la cuenta que elijas en Core. Esta pantalla no tiene una clave y no lo envía sola.</p>
    <p>Los ARGt verificados están en {verifiedArgtBalanceWallet}. Si Core muestra otra cuenta, el contrato nacería ahí y esos ARGt no quedarían en él.</p>
    <p>{recorded ? `Escrow verificado: ${recorded.contract}. Hash ${recorded.tx}. Firmar despliegue queda deshabilitado.` : !official ? "El riel no está habilitado. No se arma el despliegue." : !account ? "Core: sin conectar en este navegador. El primer botón solo pide la cuenta y la red. No despliega." : !onRail ? "Core está en otra red. Hace falta Avalanche C-Chain (43114). No se envió el despliegue." : sameVerified ? `Core listo: ${account}. Falta tu firma para crear el contrato.` : `Core conectó ${account}, que no es la cuenta con los ARGt verificados.`}</p>
    <label>Hash ya enviado
      <input value={sentHash} onChange={event => { const value = event.target.value.trim(); setSentHash(value); writePendingDeploy(value); }} placeholder="0x…"/>
    </label>
    <button className="button secondary" type="button" disabled={busy || !/^0x[a-fA-F0-9]{64}$/.test(sentHash)} onClick={() => {
      setBusy(true); setMessage("");
      consult(sentHash).then(result => setMessage(result.reason)).catch(error => setMessage(error instanceof Error ? error.message : "No se pudo consultar el despliegue.")).finally(() => setBusy(false));
    }}>Consultar despliegue</button>
    {official && (!account || !onRail) && <button className="button secondary" type="button" disabled={busy} onClick={() => void connectCore()}>{account ? "Cambiar Core a Avalanche 43114" : "Conectar Core"}</button>}
    <button className="button primary" type="button" disabled={busy || !official || !account || !onRail || Boolean(recorded)} onClick={() => {
      setBusy(true); setMessage("");
      deploy().then(result => setMessage(result.reason)).catch(error => setMessage(error instanceof Error ? error.message : "No se pudo firmar el despliegue.")).finally(() => setBusy(false));
    }}>Firmar despliegue con Core</button>
    <p>Para verificar en el explorador: compilador 0.8.28, optimizador activo, 200 corridas, archivos ObraClaraPartialEscrow.sol y SafeERC20.sol. Los argumentos son el token configurado, sus decimales y la cadena de ese riel (43114 para ARGt, 43113 para Fuji). La guía está en contracts/VERIFY.md.</p>
    {message && <p role="status">{message}</p>}
  </div>;
}
