// Circle publishes this USDC contract for Avalanche Fuji (chain 43113).
// https://developers.circle.com/stablecoins/usdc-contract-addresses
export const CIRCLE_FUJI_USDC = "0x5425890298aed601595a70AB815c96711a31Bc65";

// Tether's public Avalanche addresses are mainnet C-Chain (43114), not Fuji.
// They are listed here only so a misconfigured environment cannot use them.
export const MAINNET_USDT = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7";
export const MAINNET_USDT_E = "0xc7198437980c041c805A1EDcbA50c1Ce5db95118";

const blocked = new Set([CIRCLE_FUJI_USDC, MAINNET_USDT, MAINNET_USDT_E].map(item => item.toLowerCase()));

export type AssetConfig = {
  symbol: "USDT" | "USDC";
  address: string;
  decimals: number | null;
  simulation: boolean;
  ready: boolean;
  blocked: string;
};

const pending = (blockedMessage: string): AssetConfig => ({
  symbol: "USDT",
  address: "",
  decimals: null,
  simulation: false,
  ready: false,
  blocked: blockedMessage,
});

export function readAssetConfig(input: {symbol?: string | null; address?: string | null; decimals?: string | number | null; simulation?: boolean}): AssetConfig {
  const requested = (input.symbol || "USDT").toUpperCase();
  const symbol = requested === "USDC" ? "USDC" : "USDT";
  const address = (input.address || "").trim();
  const decimals = input.decimals == null || input.decimals === "" ? null : Number(input.decimals);
  const simulation = input.simulation === true;
  const validAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
  const lower = address.toLowerCase();
  if (symbol === "USDC") {
    if (validAddress && lower === CIRCLE_FUJI_USDC.toLowerCase() && decimals === 6 && !simulation) {
      return {symbol: "USDC", address: CIRCLE_FUJI_USDC, decimals: 6, simulation: false, ready: true, blocked: ""};
    }
    return {symbol: "USDC", address: "", decimals: null, simulation: false, ready: false, blocked: "USDC queda disponible solo con el contrato de Circle en Fuji y 6 decimales. No es el activo de esta compra y no reemplaza a USDT."};
  }
  if (!validAddress || decimals == null || !Number.isInteger(decimals) || decimals < 2 || decimals > 18) {
    return pending("Falta el contrato USDT de Fuji. La dirección y los decimales no están confirmados. No se usa USDC ni una dirección de mainnet en su lugar.");
  }
  if (blocked.has(lower)) {
    const why = lower === CIRCLE_FUJI_USDC.toLowerCase()
      ? "Esa dirección es USDC de Circle en Fuji, no USDT."
      : "Esa dirección pertenece a Avalanche mainnet, no a Fuji.";
    return pending(why + " No se arma ninguna transacción.");
  }
  return {symbol: "USDT", address, decimals, simulation, ready: true, blocked: ""};
}

export function canMoveOfficialFunds(asset: AssetConfig) {
  return asset.ready && !asset.simulation && asset.blocked === "";
}

export const LIVE_CEMENT_OFFER_ID = "corralon-norte-loma";
export const LIVE_CEMENT_QUANTITY = 100;
export const LIVE_CEMENT_WHOLE_TOKENS = BigInt(5);
