// @ts-expect-error - Node-side Pay contract checks import sibling TypeScript sources directly.
import { getVantaTokenCatalogEntry, type VantaPaymentSuiteTokenSymbol } from "../tokens/vantaTokenCatalog.ts";

export const VANTA_PAY_ASSET_SYMBOLS = [
  "USDC",
  "SOL",
  "USDT",
  "EURC",
  "USDS",
  "USX",
  "USD1",
  "JupUSD",
] as const;

for (const asset of VANTA_PAY_ASSET_SYMBOLS) {
  if (!getVantaTokenCatalogEntry(asset).payBetaAccepted) {
    throw new Error(`${asset} is missing payBetaAccepted catalog truth.`);
  }
}

export type VantaPayAsset = (typeof VANTA_PAY_ASSET_SYMBOLS)[number];

export function isVantaPayAsset(value: string): value is VantaPayAsset {
  return (VANTA_PAY_ASSET_SYMBOLS as readonly string[]).includes(value);
}

export function getVantaPayAssetDecimals(asset: VantaPayAsset) {
  return getVantaTokenCatalogEntry(asset).decimals;
}

export function getVantaPayAssetName(asset: VantaPayAsset) {
  return getVantaTokenCatalogEntry(asset).name;
}

export function assertVantaPayAsset(value: VantaPaymentSuiteTokenSymbol): VantaPayAsset {
  if (!isVantaPayAsset(value)) {
    throw new Error(`${value} is not accepted by Vanta Pay beta.`);
  }

  return value;
}
