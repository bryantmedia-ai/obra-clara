// Circle publishes this USDC contract for Avalanche Fuji (chain 43113).
// https://developers.circle.com/stablecoins/usdc-contract-addresses
export const CIRCLE_FUJI_USDC = "0x5425890298aed601595a70AB815c96711a31Bc65";

// Tether's public Avalanche addresses are mainnet C-Chain (43114), not Fuji.
// They stay blocked on the Fuji rail and are not the ARGt escrow.
export const MAINNET_USDT = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7";
export const MAINNET_USDT_E = "0xc7198437980c041c805A1EDcbA50c1Ce5db95118";

// Twin ARGt on Avalanche C-Chain. 18 decimals. Not a dollar stablecoin.
export const AVALANCHE_ARGT = "0x2E4e93eCA2E16E4989b894e188B7F7fC0175703B";
export const AVALANCHE_ARGT_DECIMALS = 18;
export const AVALANCHE_CHAIN_ID = 43114;
export const FUJI_CHAIN_ID = 43113;
export const ARBITRUM_CHAIN_ID = 42161;
export const TWIN_ARGT_ARBITRUM = "0x59863989d080B22476DB95656d0C3CC18be92214";
export const TWIN_ADAPTER = "0x4821FBf47B261F0D52Ba0F941CF67b8648f82691";

const blocked = new Set([CIRCLE_FUJI_USDC, MAINNET_USDT, MAINNET_USDT_E].map(item => item.toLowerCase()));

export type EscrowRail = "fuji" | "avalanche-argt";
export type AssetSymbol = "USDT" | "USDC" | "ARGt";

export type AssetConfig = {
  rail: EscrowRail;
  symbol: AssetSymbol;
  address: string;
  decimals: number | null;
  chainId: number;
  simulation: boolean;
  ready: boolean;
  enabled: boolean;
  blocked: string;
};

const pending = (blockedMessage: string): AssetConfig => ({
  rail: "fuji",
  symbol: "USDT",
  address: "",
  decimals: null,
  chainId: FUJI_CHAIN_ID,
  simulation: false,
  ready: false,
  enabled: false,
  blocked: blockedMessage,
});

export function readAssetConfig(input: {rail?: string | null; symbol?: string | null; address?: string | null; decimals?: string | number | null; simulation?: boolean; enabled?: boolean} = {}): AssetConfig {
  if (input.rail === "avalanche-argt") return readAvalanche(input);
  const requested = (input.symbol || "USDT").toUpperCase();
  const symbol = requested === "USDC" ? "USDC" : "USDT";
  const address = (input.address || "").trim();
  const decimals = input.decimals == null || input.decimals === "" ? null : Number(input.decimals);
  const simulation = input.simulation === true;
  const validAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
  const lower = address.toLowerCase();
  if (symbol === "USDC") {
    if (validAddress && lower === CIRCLE_FUJI_USDC.toLowerCase() && decimals === 6 && !simulation) {
      return {rail: "fuji", symbol: "USDC", address: CIRCLE_FUJI_USDC, decimals: 6, chainId: FUJI_CHAIN_ID, simulation: false, ready: true, enabled: true, blocked: ""};
    }
    return {rail: "fuji", symbol: "USDC", address: "", decimals: null, chainId: FUJI_CHAIN_ID, simulation: false, ready: false, enabled: false, blocked: "USDC queda disponible solo con el contrato de Circle en Fuji y 6 decimales. No es el activo de esta compra y no reemplaza a USDT ni a ARGt."};
  }
  if (!validAddress || decimals == null || !Number.isInteger(decimals) || decimals < 2 || decimals > 18) {
    return pending("Falta el contrato USDT de Fuji. La dirección y los decimales no están confirmados. No se usa USDC, ARGt ni una dirección de mainnet en su lugar.");
  }
  if (blocked.has(lower) || lower === AVALANCHE_ARGT.toLowerCase()) {
    const why = lower === CIRCLE_FUJI_USDC.toLowerCase()
      ? "Esa dirección es USDC de Circle en Fuji, no USDT."
      : lower === AVALANCHE_ARGT.toLowerCase()
        ? "Esa dirección es ARGt de Avalanche mainnet, no USDT de Fuji."
        : "Esa dirección pertenece a Avalanche mainnet, no a Fuji.";
    return pending(why + " No se arma ninguna transacción.");
  }
  return {rail: "fuji", symbol: "USDT", address, decimals, chainId: FUJI_CHAIN_ID, simulation, ready: true, enabled: !simulation, blocked: ""};
}

function readAvalanche(input: {symbol?: string | null; address?: string | null; decimals?: string | number | null; simulation?: boolean; enabled?: boolean}): AssetConfig {
  const base: AssetConfig = {rail: "avalanche-argt", symbol: "ARGt", address: "", decimals: null, chainId: AVALANCHE_CHAIN_ID, simulation: false, ready: false, enabled: false, blocked: ""};
  const requested = (input.symbol || "ARGt").toUpperCase();
  if (requested !== "ARGT") {
    return {...base, blocked: "Este riel solo acepta ARGt. USDT y USDC no se tratan como pesos ni como dólares de la compra."};
  }
  const address = (input.address || AVALANCHE_ARGT).trim();
  const decimals = input.decimals == null || input.decimals === "" ? null : Number(input.decimals);
  const simulation = input.simulation === true;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address) || address.toLowerCase() !== AVALANCHE_ARGT.toLowerCase()) {
    return {...base, simulation, blocked: "Solo se acepta el ARGt de Avalanche " + AVALANCHE_ARGT + ". Otra dirección, aunque sea USDT, queda rechazada."};
  }
  if (decimals !== AVALANCHE_ARGT_DECIMALS) {
    return {...base, simulation, blocked: "ARGt tiene 18 decimales. Una configuración de 6 decimales no se acepta y no se reinterpreta el importe."};
  }
  const enabled = input.enabled === true && !simulation;
  return {
    ...base,
    address: AVALANCHE_ARGT,
    decimals: AVALANCHE_ARGT_DECIMALS,
    simulation,
    ready: true,
    enabled,
    blocked: enabled ? "" : "SIMULACIÓN. Mainnet ARGt no está habilitado para firmar. No es producción y no equivale a dólares.",
  };
}

export function canMoveOfficialFunds(asset: AssetConfig) {
  return asset.ready && asset.enabled && !asset.simulation && asset.blocked === "";
}

export const LIVE_CEMENT_OFFER_ID = "corralon-norte-loma";
export const LIVE_CEMENT_QUANTITY = 100;
export const LIVE_CEMENT_STOCK = 1000;
export const LIVE_CEMENT_PROJECT_ID = "palermo-verificacion";
export const LIVE_CEMENT_SELLER = "0x62d573cdb905919c5ef8b4159f1d9bb7fcb92eeb";
export const LIVE_CEMENT_WHOLE_TOKENS = BigInt(5);
