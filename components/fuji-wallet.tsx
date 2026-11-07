"use client";

import {useEffect, useState} from "react";

const fujiChain = "0xa869";
const usdc = "0x5425890298aed601595a70AB815c96711a31Bc65";
type Provider = {
  request(args: {method: string; params?: unknown[]}): Promise<unknown>;
  on?(event: string, listener: () => void): void;
  removeListener?(event: string, listener: () => void): void;
};
type Wallet = {address: string; chain: string; avax?: string; usdc?: string; error?: string};

function core() {
  return (window as Window & {avalanche?: Provider}).avalanche;
}

function addressOf(accounts: unknown) {
  const address = Array.isArray(accounts) ? accounts[0] : undefined;
  return typeof address === "string" && /^0x[a-f\d]{40}$/i.test(address) ? address : "";
}

function amount(hex: unknown, decimals: number) {
  if (typeof hex !== "string" || !/^0x[a-f\d]+$/i.test(hex)) throw new Error("Saldo inválido");
  const value = BigInt(hex);
  const divisor = BigInt(10) ** BigInt(decimals);
  const fraction = (value % divisor).toString().padStart(decimals, "0").replace(/0+$/, "");
  return (value / divisor).toLocaleString("es-AR") + (fraction ? "," + fraction : "");
}

export function FujiWallet({role}: {role: "Compras" | "Ventas"}) {
  const storageKey = "oc-fuji-wallet:" + role;
  const [linked, setLinked] = useState("");
  const [wallet, setWallet] = useState<Wallet>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try { setLinked(localStorage.getItem(storageKey) ?? ""); } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (!linked) return;
    let active = true;
    let version = 0;
    const provider = core();
    const update = async () => {
      const reading = ++version;
      const publish = (next?: Wallet) => {
        if (active && reading === version) setWallet(next);
      };
      if (!provider) {
        publish({address: "", chain: "", error: "Abrí esta página en Chrome con Core habilitado."});
        return;
      }
      try {
        const [accounts, chainId] = await Promise.all([
          provider.request({method: "eth_accounts"}),
          provider.request({method: "eth_chainId"}),
        ]);
        const address = addressOf(accounts);
        const chain = String(chainId).toLowerCase();
        if (address.toLowerCase() !== linked.toLowerCase() || chain !== fujiChain) {
          publish({address, chain});
          return;
        }

        try {
          const [native, token] = await Promise.all([
            provider.request({method: "eth_getBalance", params: [address, "latest"]}),
            provider.request({method: "eth_call", params: [
              {to: usdc, data: "0x70a08231" + address.slice(2).toLowerCase().padStart(64, "0")},
              "latest",
            ]}),
          ]);
          publish({address, chain, avax: amount(native, 18), usdc: amount(token, 6)});
        } catch {
          publish({address, chain, error: "Fuji no devolvió los saldos. Probá actualizar."});
        }
      } catch {
        publish({address: "", chain: "", error: "No se pudo consultar Core. Revisá si está desbloqueado."});
      }
    };
    const reset = () => {
      setWallet(undefined);
      void update();
    };
    void update();
    provider?.on?.("accountsChanged", reset);
    provider?.on?.("chainChanged", reset);
    provider?.on?.("disconnect", reset);
    window.addEventListener("focus", reset);
    window.addEventListener("oc:refresh-fuji", reset);
    const interval = window.setInterval(() => { if (!document.hidden) void update(); }, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", reset);
      window.removeEventListener("oc:refresh-fuji", reset);
      provider?.removeListener?.("accountsChanged", reset);
      provider?.removeListener?.("chainChanged", reset);
      provider?.removeListener?.("disconnect", reset);
    };
  }, [linked]);

  async function connect() {
    setNotice("");
    const provider = core();
    if (!provider) {
      setNotice("Abrí esta página en Chrome con Core habilitado.");
      return;
    }
    setBusy(true);
    try {
      const address = addressOf(await provider.request({method: "eth_requestAccounts"}));
      if (!address) {
        setNotice("Elegí una cuenta en Core para continuar.");
        return;
      }
      if (linked && linked.toLowerCase() !== address.toLowerCase()) {
        setNotice("Elegí en Core la cuenta vinculada a este perfil.");
        return;
      }
      const otherKey = "oc-fuji-wallet:" + (role === "Compras" ? "Ventas" : "Compras");
      if (localStorage.getItem(otherKey)?.toLowerCase() === address.toLowerCase()) {
        setNotice("Esta dirección ya está vinculada al otro perfil en este sitio. Cambiá de cuenta en Core.");
        return;
      }
      localStorage.setItem(storageKey, address);
      setLinked(address);
      window.dispatchEvent(new Event("oc:refresh-fuji"));
    } catch {
      setNotice("Core no completó la conexión. Desbloqueá la extensión y volvé a intentar.");
    } finally {
      setBusy(false);
    }
  }

  async function switchNetwork() {
    setNotice("");
    setBusy(true);
    try {
      const provider = core();
      if (!provider) throw new Error("Core no disponible");
      await provider.request({method: "wallet_switchEthereumChain", params: [{chainId: fujiChain}]});
      window.dispatchEvent(new Event("oc:refresh-fuji"));
    } catch {
      setNotice("En Core, activá el modo Testnet y seleccioná Avalanche Fuji C-Chain.");
    } finally {
      setBusy(false);
    }
  }

  const sameAccount = !!linked && wallet?.address.toLowerCase() === linked.toLowerCase();
  const connected = sameAccount && wallet?.chain === fujiChain;
  const status = !linked ? "Sin vincular" : connected ? "Core conectado" : "Vinculada en este navegador";
  const message = notice || wallet?.error || (!linked
    ? `Elegí en Core la cuenta ${role === "Compras" ? "Comprador" : "Vendedor"} y conectala a este perfil.`
    : !wallet ? "Consultando Core…"
    : !sameAccount ? "Seleccioná en Core la dirección vinculada a este perfil para ver sus saldos."
    : !connected ? "Cambiá a Fuji para consultar los saldos de prueba." : "");

  return (
    <section className="fuji-wallet panel" aria-labelledby="fuji-wallet-title">
      <div className="fuji-wallet-heading">
        <div>
          <span className="fn-eyebrow">AVALANCHE FUJI C-CHAIN · TESTNET</span>
          <h2 id="fuji-wallet-title">Billetera de {role}</h2>
          <p>Saldo de USDC de Circle en Fuji. No es USDT y no se convierte. La compra de cemento usa USDT, que sigue sin contrato confirmado.</p>
        </div>
        <span className={`ov-tag ${connected ? "green" : "neutral"}`}>{status}</span>
      </div>
      {linked && (
        <a className="fuji-address" href={`https://explorer-test.avax.network/c-chain/address/${linked}`} target="_blank" rel="noreferrer">
          {linked} ↗
        </a>
      )}
      <dl className="fuji-wallet-balances">
        <div><dt>USDC de Circle</dt><dd>{connected ? wallet?.usdc ?? "—" : "—"}</dd></div>
        <div><dt>AVAX para comisiones</dt><dd>{connected ? wallet?.avax ?? "—" : "—"}</dd></div>
      </dl>
      {message && <p className="fuji-wallet-status" role="status">{message}</p>}
      <div className="fuji-wallet-actions">
        {!sameAccount && <button className="button primary" disabled={busy} onClick={connect}>Conectar Core</button>}
        {sameAccount && !connected && <button className="button primary" disabled={busy} onClick={switchNetwork}>Cambiar a Fuji</button>}
        {connected && <button className="button secondary" onClick={() => window.dispatchEvent(new Event("oc:refresh-fuji"))}>Actualizar saldos</button>}
        {linked && <button className="button secondary" disabled={busy} onClick={() => {
          localStorage.removeItem(storageKey);
          setLinked("");
          setWallet(undefined);
          setNotice("");
        }}>Desvincular de {role}</button>}
      </div>
    </section>
  );
}
