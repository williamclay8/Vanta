import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildVantaPayApprovalPacket } from "../src/pay/vantaPayApprovalPacket.ts";

const repoRoot = resolve(import.meta.dirname, "..");
const designContract = readFileSync(resolve(repoRoot, "DESIGN.md"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const walletPickerCheck = readFileSync(resolve(repoRoot, "scripts/check-vanta-wallet-picker.mjs"), "utf8");
const walletBrowserSafetyCheck = readFileSync(
  resolve(repoRoot, "scripts/check-vanta-wallet-browser-signing-safety.mjs"),
  "utf8",
);
const mobileBrowserCheck = readFileSync(resolve(repoRoot, "scripts/check-vanta-mobile-browser.mjs"), "utf8");
const payBrowserCheck = readFileSync(resolve(repoRoot, "scripts/check-vanta-pay-browser.mjs"), "utf8");

assert.equal(
  packageJson.scripts?.["design:contract-check"],
  "node scripts/check-vanta-design-contract.mjs",
  "package.json must expose design:contract-check.",
);

assert.match(designContract, /Wallet Picker State Table/u, "DESIGN.md must include the wallet picker state table.");
assert.match(designContract, /Peer Top-Up State Table/u, "DESIGN.md must include the Peer top-up state table.");
assert.match(
  designContract,
  /Pay Merchant Settlement State Table/u,
  "DESIGN.md must include the Pay merchant settlement state table.",
);
assert.match(
  designContract,
  /requiresSimulationBeforeSignature/u,
  "DESIGN.md must map wallet safety copy to machine-readable wallet-signing fields.",
);
assert.match(
  designContract,
  /pay:merchant-trust-status -- --json/u,
  "DESIGN.md must reference the merchant trust JSON verification path.",
);
assert.match(
  designContract,
  /phaseOrder: \["preview", "approve", "execute", "settle"\]/u,
  "DESIGN.md must preserve the approval packet phase order.",
);
assert.match(
  designContract,
  /lifecycleModel: "preview-approve-execute-settle"/u,
  "DESIGN.md must preserve the settlement lifecycle model.",
);
assert.match(
  designContract,
  /getPeerOnrampAvailability\(\)/u,
  "DESIGN.md must point Peer state mapping at the typed availability boundary.",
);
assert.match(
  designContract,
  /peer:onramp-contract-check/u,
  "DESIGN.md must mention the current Peer contract check.",
);

assert.match(
  walletPickerCheck,
  /No wallet funds detected/u,
  "Wallet picker check must enforce the canonical funding-recovery title.",
);
assert.match(
  walletPickerCheck,
  /Top up with Peer/u,
  "Wallet picker check must enforce the canonical Peer CTA copy.",
);
assert.match(
  walletPickerCheck,
  /Connect, create a fresh wallet, or top up with Peer on desktop\./u,
  "Wallet picker check must enforce the canonical funding-recovery body copy.",
);
assert.match(
  walletBrowserSafetyCheck,
  /Simulation before signing/u,
  "Wallet browser signing safety check must enforce the canonical safety title.",
);
assert.match(
  walletBrowserSafetyCheck,
  /Live actions are simulated before wallet approval\./u,
  "Wallet browser signing safety check must enforce the canonical safety body copy.",
);
assert.match(
  walletBrowserSafetyCheck,
  /No wallet funds detected/u,
  "Wallet browser signing safety check must enforce the canonical funding-recovery title.",
);
assert.match(
  walletBrowserSafetyCheck,
  /Connect, create a fresh wallet, or top up with Peer on desktop\./u,
  "Wallet browser signing safety check must enforce the canonical funding-recovery body copy.",
);
assert.match(
  walletBrowserSafetyCheck,
  /Top up with Peer/u,
  "Wallet browser signing safety check must enforce the canonical funding-recovery CTA.",
);
assert.match(
  mobileBrowserCheck,
  /Funding/u,
  "Mobile browser check must enforce that the desktop-only funding label stays hidden on mobile.",
);
assert.match(
  mobileBrowserCheck,
  /No wallet funds detected/u,
  "Mobile browser check must enforce that the desktop-only funding title stays hidden on mobile.",
);
assert.match(
  mobileBrowserCheck,
  /Connect, create a fresh wallet, or top up with Peer on desktop\./u,
  "Mobile browser check must enforce that the desktop-only funding body copy stays hidden on mobile.",
);
assert.match(
  mobileBrowserCheck,
  /Top up with Peer/u,
  "Mobile browser check must enforce that the desktop-only funding CTA stays hidden on mobile.",
);
assert.match(
  payBrowserCheck,
  /Design partner preview/u,
  "Pay browser check must enforce the canonical design-partner eyebrow.",
);
assert.match(
  payBrowserCheck,
  /Merchant pilot/u,
  "Pay browser check must enforce the canonical merchant heading.",
);
assert.match(
  payBrowserCheck,
  /Private settlement without protocol overhead\./u,
  "Pay browser check must enforce the canonical merchant body copy including punctuation.",
);
assert.match(
  payBrowserCheck,
  /Settlement lifecycle/u,
  "Pay browser check must enforce the canonical lifecycle label casing.",
);
assert.match(
  payBrowserCheck,
  /Refunds: merchant-visible/u,
  "Pay browser check must enforce the canonical refunds copy.",
);
assert.match(
  payBrowserCheck,
  /Withdrawals: merchant-visible/u,
  "Pay browser check must enforce the canonical withdrawals copy.",
);
assert.match(
  payBrowserCheck,
  /Reconciliation: merchant-visible/u,
  "Pay browser check must enforce the canonical reconciliation copy.",
);

const merchantTrustStatusCheck = readFileSync(
  resolve(repoRoot, "scripts/check-vanta-pay-merchant-trust-status.mjs"),
  "utf8",
);
assert.match(
  merchantTrustStatusCheck,
  /checkoutSurface/u,
  "Merchant trust status check must enforce the canonical checkoutSurface field.",
);
assert.match(
  merchantTrustStatusCheck,
  /settlementModel/u,
  "Merchant trust status check must enforce the canonical settlementModel field.",
);
assert.match(
  merchantTrustStatusCheck,
  /refundSupport/u,
  "Merchant trust status check must enforce the canonical refundSupport field.",
);
assert.match(
  merchantTrustStatusCheck,
  /withdrawalSupport/u,
  "Merchant trust status check must enforce the canonical withdrawalSupport field.",
);

const merchantTrustStatus = JSON.parse(
  execFileSync("npm", ["run", "--silent", "pay:merchant-trust-status", "--", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  }),
);

assert.equal(
  merchantTrustStatus.privacyMode,
  "controlled-privacy",
  "Merchant trust status must keep privacyMode aligned with DESIGN.md.",
);
assert.equal(
  merchantTrustStatus.policyMode,
  "legible-trust",
  "Merchant trust status must keep policyMode aligned with DESIGN.md.",
);
assert.equal(
  merchantTrustStatus.productionReady,
  false,
  "Merchant trust status must keep productionReady false.",
);

const walletSigningStatus = JSON.parse(
  execFileSync("npm", ["run", "--silent", "mainnet:wallet-signing-status", "--", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  }),
);

assert.equal(
  walletSigningStatus.requiresSimulationBeforeSignature,
  true,
  "Wallet-signing status must require simulation before signature.",
);
assert.equal(
  walletSigningStatus.requiresExplicitHumanApproval,
  true,
  "Wallet-signing status must require explicit human approval.",
);
assert.equal(
  walletSigningStatus.mainnetSubmissionExplicitlyBlocked,
  false,
  "Wallet-signing status must keep the verified public live-submission redeploy truth.",
);
assert.equal(
  walletSigningStatus.productionDeploymentModeBannerVisible,
  false,
  "Wallet-signing status must keep the verified cleared beta-mode banner truth.",
);
assert.equal(
  walletSigningStatus.productionSettlementOfflineBannerVisible,
  false,
  "Wallet-signing status must keep the verified cleared settlement-offline banner truth.",
);

const approvalPacket = buildVantaPayApprovalPacket();
assert.deepEqual(
  approvalPacket.phaseOrder,
  ["preview", "approve", "execute", "settle"],
  "Approval packet phase order must stay aligned with DESIGN.md.",
);
assert.equal(
  approvalPacket.policyMode,
  "legible-trust",
  "Approval packet policyMode must stay aligned with DESIGN.md.",
);
assert.equal(
  approvalPacket.simulationRequired,
  true,
  "Approval packet must keep simulationRequired true.",
);
assert.equal(
  approvalPacket.walletApprovalRequired,
  true,
  "Approval packet must keep walletApprovalRequired true.",
);

console.log("Vanta design contract check: PASS");
