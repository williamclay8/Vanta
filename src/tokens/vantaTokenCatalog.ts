export const VANTA_PAYMENT_SUITE_TOKEN_SYMBOLS = [
  "USDC",
  "USDT",
  "EURC",
  "USDS",
  "USX",
  "USD1",
  "JupUSD",
  "JTO",
  "BONK",
  "JUP",
  "PYUSD",
  "WIF",
  "KMNO",
  "SOL",
] as const;

export type VantaPaymentSuiteTokenSymbol =
  (typeof VANTA_PAYMENT_SUITE_TOKEN_SYMBOLS)[number];

export type VantaTokenKind = "spl-shield-token" | "native-sol" | "pay-symbol";

export type VantaTokenCatalogEntry = {
  decimals: number;
  kind: VantaTokenKind;
  name: string;
  payBetaAccepted: boolean;
  priority: number;
  shieldFamily: boolean;
  symbol: VantaPaymentSuiteTokenSymbol;
};

export const VANTA_TOKEN_CATALOG = [
  {
    decimals: 6,
    kind: "spl-shield-token",
    name: "USD Coin",
    payBetaAccepted: true,
    priority: 0,
    shieldFamily: true,
    symbol: "USDC",
  },
  {
    decimals: 6,
    kind: "spl-shield-token",
    name: "Tether USD",
    payBetaAccepted: true,
    priority: 1,
    shieldFamily: true,
    symbol: "USDT",
  },
  {
    decimals: 6,
    kind: "spl-shield-token",
    name: "Euro Coin",
    payBetaAccepted: true,
    priority: 2,
    shieldFamily: true,
    symbol: "EURC",
  },
  {
    decimals: 6,
    kind: "spl-shield-token",
    name: "USDS",
    payBetaAccepted: true,
    priority: 3,
    shieldFamily: true,
    symbol: "USDS",
  },
  {
    decimals: 6,
    kind: "spl-shield-token",
    name: "USX",
    payBetaAccepted: true,
    priority: 4,
    shieldFamily: true,
    symbol: "USX",
  },
  {
    decimals: 6,
    kind: "spl-shield-token",
    name: "USD1",
    payBetaAccepted: true,
    priority: 5,
    shieldFamily: true,
    symbol: "USD1",
  },
  {
    decimals: 6,
    kind: "spl-shield-token",
    name: "Jupiter USD",
    payBetaAccepted: true,
    priority: 6,
    shieldFamily: true,
    symbol: "JupUSD",
  },
  {
    decimals: 9,
    kind: "spl-shield-token",
    name: "Jito",
    payBetaAccepted: false,
    priority: 20,
    shieldFamily: true,
    symbol: "JTO",
  },
  {
    decimals: 5,
    kind: "spl-shield-token",
    name: "Bonk",
    payBetaAccepted: false,
    priority: 21,
    shieldFamily: true,
    symbol: "BONK",
  },
  {
    decimals: 6,
    kind: "spl-shield-token",
    name: "Jupiter",
    payBetaAccepted: false,
    priority: 22,
    shieldFamily: true,
    symbol: "JUP",
  },
  {
    decimals: 6,
    kind: "spl-shield-token",
    name: "PayPal USD",
    payBetaAccepted: false,
    priority: 30,
    shieldFamily: true,
    symbol: "PYUSD",
  },
  {
    decimals: 6,
    kind: "spl-shield-token",
    name: "dogwifhat",
    payBetaAccepted: false,
    priority: 23,
    shieldFamily: true,
    symbol: "WIF",
  },
  {
    decimals: 6,
    kind: "spl-shield-token",
    name: "Kamino",
    payBetaAccepted: false,
    priority: 24,
    shieldFamily: true,
    symbol: "KMNO",
  },
  {
    decimals: 9,
    kind: "native-sol",
    name: "Solana",
    payBetaAccepted: true,
    priority: 40,
    shieldFamily: true,
    symbol: "SOL",
  },
] as const satisfies readonly VantaTokenCatalogEntry[];

export function listVantaTokenCatalogEntries() {
  return VANTA_TOKEN_CATALOG;
}

export function getVantaTokenCatalogEntry(symbol: VantaPaymentSuiteTokenSymbol) {
  const entry = VANTA_TOKEN_CATALOG.find((candidate) => candidate.symbol === symbol);

  if (!entry) {
    throw new Error(`Unknown Vanta token symbol: ${symbol}`);
  }

  return entry;
}

export function listVantaShieldFamilySymbols() {
  return VANTA_TOKEN_CATALOG.filter((entry) => entry.shieldFamily).map(
    (entry) => entry.symbol,
  );
}

export function listVantaPayBetaAcceptedSymbols() {
  return VANTA_TOKEN_CATALOG.filter((entry) => entry.payBetaAccepted).map(
    (entry) => entry.symbol,
  );
}
