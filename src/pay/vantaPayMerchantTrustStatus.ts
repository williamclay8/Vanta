import type { VantaPayMerchantTrustStatus } from "./vantaPayTypes";

export function getVantaPayMerchantTrustStatus(): VantaPayMerchantTrustStatus {
  return {
    version: "vanta-pay-merchant-trust-status-0.1",
    checkoutSurface: "hosted-or-embedded",
    settlementModel: "private-settlement-adapter",
    refundSupport: "supported",
    withdrawalSupport: "supported",
    privacyMode: "controlled-privacy",
    policyMode: "legible-trust",
    productionReady: false,
  };
}
