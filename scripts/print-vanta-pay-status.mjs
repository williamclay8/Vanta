const jsonMode = process.argv.includes("--json");

const result = {
  capabilities: {
    browserCheckoutVerification: true,
    durableStoreConfigured: Boolean(process.env.VANTA_PAY_STORE_PATH),
    hostedCheckoutSessions: true,
    idempotency: {
      checkoutCompletion: true,
      checkoutSessions: true,
      refunds: true,
      withdrawals: true,
    },
    paymentLinkCreation: true,
    privateExitWithdrawalRequired: true,
    privatePoolOperatorConfigured: Boolean(process.env.VANTA_PAY_PRIVATE_POOL_V2_OPERATOR_URL),
    privateRailCompletionRequired: true,
    productionDurableStoreRequired: true,
    productionHttpsWebhooks: true,
    requestValidation: "fail-closed",
    webhookDeliveryRetries: true,
    webhookSignatures: "t-v1-hmac-sha256",
  },
  contractVersion: "vanta-pay-merchant-api-0.1",
  kind: "Vanta Pay status",
  ok: true,
  productionReady: false,
  surfaces: {
    browserCheckout: "verified",
    merchantApi: "local-operator",
    privateSettlement: "private-pool-v2-adapter",
    webhookDelivery: "signed-retry",
  },
  verificationCommands: [
    "pay:contract-check",
    "pay-tab:copy-check",
    "pay:merchant-api-check",
    "pay:browser-check",
    "pay:verify",
  ],
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Vanta Pay status");
  console.log(`- contractVersion: ${result.contractVersion}`);
  console.log(`- ready: ${String(result.ok)}`);
  console.log(`- productionReady: ${String(result.productionReady)}`);
  console.log(
    `- capabilities: hostedCheckoutSessions=${String(result.capabilities.hostedCheckoutSessions)}, webhookSignatures=${result.capabilities.webhookSignatures}, webhookDeliveryRetries=${String(result.capabilities.webhookDeliveryRetries)}`,
  );
  console.log(
    `- idempotency: checkoutSessions=${String(result.capabilities.idempotency.checkoutSessions)}, checkoutCompletion=${String(result.capabilities.idempotency.checkoutCompletion)}, refunds=${String(result.capabilities.idempotency.refunds)}, withdrawals=${String(result.capabilities.idempotency.withdrawals)}`,
  );
  console.log(
    `- productionGuards: durableStore=${String(result.capabilities.productionDurableStoreRequired)}, httpsWebhooks=${String(result.capabilities.productionHttpsWebhooks)}`,
  );
  for (const [surface, status] of Object.entries(result.surfaces)) {
    console.log(`- ${surface}: ${status}`);
  }
  console.log("- canonical verification: npm run pay:verify");
}
