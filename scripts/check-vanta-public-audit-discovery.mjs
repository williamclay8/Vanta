import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const discoveryPath = resolve(repoRoot, "public/.well-known/vanta-audit.json");
const auditAliasPath = resolve(repoRoot, "public/.well-known/audit");
const auditPackagePath = resolve(repoRoot, "docs/audit-package.md");
const packageJsonPath = resolve(repoRoot, "package.json");

const requiredRefs = [
  "SECURITY_LIMITATIONS.md",
  "docs/audit-package.md",
  "VANTA_ZK_REVIEW.findings.json",
  "docs/zk/c01-production-verifier-backend-decision.md",
  "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json",
  "ops/mainnet/private-pool-v2-c01-positive-proof-verified-claim-gate.evidence.json",
  "ops/mainnet/audit-review.packet.template.json",
  "ops/mainnet/legal-compliance-custody.packet.template.json",
  "ops/mainnet/production-key-custody.template.json",
  "ops/mainnet/private-pool-v2-anonymity-set.evidence.json",
  "docs/twitter-intelligence/2026-06-06-requirements.md",
  "operator/pay-server.mjs",
  "src/pay/vantaPayRuntime.ts",
  "src/pay/vantaPayCommittedCheckoutAcceptance.ts",
  "src/pay/vantaPayCounterpartyActivation.ts",
  "src/pay/vantaPayReceiptGrowthLoop.ts",
  "src/pay/vantaPayGrowthLoopEvidence.ts",
  "src/pay/vantaPayMeasuredLoopImplementation.ts",
  "src/pay/vantaPayReceiptPublicView.ts",
  "src/components/PayReceiptPacketCard.tsx",
  "src/pages/ReceiptVerificationPage.tsx",
  "scripts/check-vanta-pay-committed-checkout-acceptance.mjs",
  "scripts/check-vanta-pay-counterparty-activation.mjs",
  "scripts/check-vanta-pay-measured-loop-implementation.mjs",
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertRelativeRepoRef(ref) {
  assert.equal(typeof ref, "string", `Expected ref to be a string: ${String(ref)}`);
  assert.ok(ref.length > 0, "Refs must be non-empty.");
  assert.ok(!isAbsolute(ref), `Ref must be relative, not absolute: ${ref}`);
  assert.ok(!ref.includes("://"), `Ref must be repo-local, not a URL: ${ref}`);
  assert.ok(!ref.startsWith("../"), `Ref must stay inside the repo: ${ref}`);
  assert.ok(!ref.includes("/../"), `Ref must stay inside the repo: ${ref}`);
  assert.ok(existsSync(resolve(repoRoot, ref)), `Ref must point to an existing repo path: ${ref}`);
}

function walk(value, visitor, path = "$") {
  visitor(value, path);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, visitor, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      visitor(key, `${path}.${key}#key`);
      walk(entry, visitor, `${path}.${key}`);
    }
  }
}

function isRepoRefKey(key) {
  return (
    /(?:Ref|Refs|Package|Ledger|Decision|Template|Templates)$/u.test(key) ||
    key === "securityLimitations"
  );
}

function assertRepoRefsForKey(key, value, path) {
  if (!isRepoRefKey(key)) {
    return;
  }
  if (typeof value === "string") {
    assertRelativeRepoRef(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      assert.equal(typeof entry, "string", `${path}[${index}] must be a repo-local ref string.`);
      assertRelativeRepoRef(entry);
    });
  }
}

function assertSafeNpmRunCommand(command, label) {
  assert.equal(typeof command, "string", `${label} must be a string.`);
  assert.ok(!/[;&|`$<>]/u.test(command), `${label} must not include shell operators: ${command}`);
  const match = command.match(/^npm run ([A-Za-z0-9:_-]+)$/u);
  assert.ok(match, `${label} must be an npm run command: ${command}`);
  assert.ok(packageJson.scripts?.[match[1]], `${label} references missing package script: ${match[1]}`);
}

function walkRepoRefs(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkRepoRefs(entry, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assertRepoRefsForKey(key, entry, `${path}.${key}`);
      walkRepoRefs(entry, `${path}.${key}`);
    }
  }
}

assert.ok(existsSync(discoveryPath), "Missing public/.well-known/vanta-audit.json.");
assert.ok(existsSync(auditAliasPath), "Missing public/.well-known/audit.");
assert.ok(existsSync(auditPackagePath), "Missing docs/audit-package.md.");

const discoverySource = readFileSync(discoveryPath, "utf8");
const auditAliasSource = readFileSync(auditAliasPath, "utf8");
const discovery = JSON.parse(discoverySource);
const auditAlias = JSON.parse(auditAliasSource);
const auditPackage = readFileSync(auditPackagePath, "utf8");
const packageJson = readJson(packageJsonPath);

assert.equal(
  packageJson.scripts["public:audit-discovery-check"],
  "node scripts/check-vanta-public-audit-discovery.mjs",
  "package.json must expose public:audit-discovery-check.",
);
assert.ok(
  packageJson.scripts["audit:package-check"]?.includes("npm run public:audit-discovery-check"),
  "audit:package-check must include public:audit-discovery-check.",
);

assert.equal(discovery.schemaVersion, "vanta-public-audit-discovery-0.1");
assert.equal(discovery.path, "/.well-known/vanta-audit.json");
assert.equal(discovery.generatedAt, "2026-06-28");
assert.equal(discovery.auditClaimAllowed, false);
assert.equal(discovery.thirdPartyAuditAccepted, false);
assert.equal(discovery.productionReady, false);
assert.equal(discovery.mainnetReady, false);
assert.equal(discovery.liveDeploymentVerified, true);
// Keep crawler-visible deployment evidence refs-only and claim-bounded: this is
// a public reviewer map, not a private-settlement or readiness attestation.
assert.deepEqual(discovery.websiteDeployment, {
  status: "last-verified-june-28-ui-ux-live-fix",
  lastVerifiedCommit: "4c38b2320768f86e0d357ef02769557855c3935d",
  lastVerifiedAt: "2026-06-28T17:05:53Z",
  staticDeployId: "dep-d90l4qegvqtc739khsn0",
  operatorDeployId: "dep-d8krgfpkh4rs73ffra80",
  liveUrl: "https://vantaprivacy.xyz",
  truthBoundary:
    "This records the live Vanta UI/UX repair static website entry asset assets/index-BU3kUSHJ.js from Render static deploy dep-d90l4qegvqtc739khsn0 for commit 4c38b2320768f86e0d357ef02769557855c3935d on 2026-06-28 UTC. The public discovery manifest is a reviewer map only. Private settlement, SBF, verifier, custody, anonymity, audit, generated browser Groth16 proofs, on-chain verifier acceptance, real-funds, and mainnet evidence remain blocked.",
});
assert.equal(discovery.privacyClaimAllowed, false);
assert.equal(discovery.anonymityClaimAllowed, false);
assert.equal(discovery.refsOnly, true);

assert.equal(discovery.payGrowthLoopDiscovery?.schemaVersion, "vanta-pay-growth-loop-discovery-0.1");
assert.equal(discovery.payGrowthLoopDiscovery?.status, "live-redacted-measured-claim-blocked");
assert.equal(
  discovery.payGrowthLoopDiscovery?.receiptGrowthLoopSchema,
  "vanta-pay-receipt-growth-loop-v0.1",
);
assert.equal(discovery.payGrowthLoopDiscovery?.evidenceSchema, "vanta-pay-growth-loop-evidence-v0.1");
assert.equal(
  discovery.payGrowthLoopDiscovery?.liveMeasurementSchema,
  "vanta-pay-live-growth-loop-measurement-v0.1",
);
assert.equal(
  discovery.payGrowthLoopDiscovery?.measuredLoopImplementationSchema,
  "vanta-pay-measured-loop-implementation-v0.1",
);
assert.equal(
  discovery.payGrowthLoopDiscovery?.measuredLoopImplementationStatus,
  "implemented-live-redacted-claim-blocked",
);
assert.equal(
  discovery.payGrowthLoopDiscovery?.counterpartyActivationSchema,
  "vanta-pay-counterparty-activation-v0.1",
);
assert.equal(
  discovery.payGrowthLoopDiscovery?.committedCheckoutAcceptanceSchema,
  "vanta-pay-committed-checkout-acceptance-v0.1",
);
assert.equal(
  discovery.payGrowthLoopDiscovery?.committedCheckoutAcceptanceStatus,
  "acceptance-ready-live-redacted-claim-blocked",
);
assert.equal(discovery.payGrowthLoopDiscovery?.fixtureMeasurementMode, "local-fixture-only");
assert.equal(discovery.payGrowthLoopDiscovery?.measurementMode, "live-redacted-first-party");
assert.equal(discovery.payGrowthLoopDiscovery?.liveMeasurementEnabled, true);
assert.equal(discovery.payGrowthLoopDiscovery?.statusEndpoint, "GET /v1/growth-loop/status");
assert.equal(discovery.payGrowthLoopDiscovery?.eventIntakeEndpoint, "POST /v1/growth-loop/events");
assert.equal(
  discovery.payGrowthLoopDiscovery?.implementationCheckCommand,
  "npm run pay:measured-loop-implementation-check",
);
assert.equal(
  discovery.payGrowthLoopDiscovery?.activationCheckCommand,
  "npm run pay:counterparty-activation-check",
);
assert.equal(
  discovery.payGrowthLoopDiscovery?.committedCheckoutAcceptanceCheckCommand,
  "npm run pay:committed-checkout-acceptance-check",
);
assertSafeNpmRunCommand(
  discovery.payGrowthLoopDiscovery?.implementationCheckCommand,
  "discovery.payGrowthLoopDiscovery.implementationCheckCommand",
);
assertSafeNpmRunCommand(
  discovery.payGrowthLoopDiscovery?.activationCheckCommand,
  "discovery.payGrowthLoopDiscovery.activationCheckCommand",
);
assertSafeNpmRunCommand(
  discovery.payGrowthLoopDiscovery?.committedCheckoutAcceptanceCheckCommand,
  "discovery.payGrowthLoopDiscovery.committedCheckoutAcceptanceCheckCommand",
);
assert.equal(discovery.payGrowthLoopDiscovery?.adoptionClaimAllowed, false);
assert.equal(discovery.payGrowthLoopDiscovery?.productionReady, false);
assert.equal(discovery.payGrowthLoopDiscovery?.counterpartyVerifierRoute, "/receipt/:receiptId");
assert.equal(discovery.payGrowthLoopDiscovery?.publicFixtureReceiptPath, "/receipt/rcpt_growth_loop_test");
assert.deepEqual(discovery.payGrowthLoopDiscovery?.loopSteps, [
  "private_action",
  "trust_packet_ready",
  "counterparty_verification",
  "invited_use",
  "repeated_private_action",
]);
assert.deepEqual(discovery.payGrowthLoopDiscovery?.fixtureEventTypes, [
  "receipt_generated",
  "share_link_copied",
  "counterparty_verifier_opened",
  "next_private_settlement_requested",
  "counterparty_invite_created",
  "counterparty_invite_opened",
  "next_settlement_intent_created",
  "committed_checkout_acceptance_created",
]);
assert.deepEqual(discovery.payGrowthLoopDiscovery?.sourceRefs, [
  "docs/twitter-intelligence/2026-06-06-requirements.md",
  "operator/pay-server.mjs",
  "src/pay/vantaPayRuntime.ts",
  "src/pay/vantaPayCommittedCheckoutAcceptance.ts",
  "src/pay/vantaPayCounterpartyActivation.ts",
  "src/pay/vantaPayReceiptGrowthLoop.ts",
  "src/pay/vantaPayGrowthLoopEvidence.ts",
  "src/pay/vantaPayMeasuredLoopImplementation.ts",
  "src/pay/vantaPayReceiptPublicView.ts",
  "src/components/PayReceiptPacketCard.tsx",
  "src/pages/ReceiptVerificationPage.tsx",
  "scripts/check-vanta-pay-committed-checkout-acceptance.mjs",
  "scripts/check-vanta-pay-counterparty-activation.mjs",
  "scripts/check-vanta-pay-measured-loop-implementation.mjs",
]);
assert.deepEqual(discovery.payGrowthLoopDiscovery?.verificationCommands, [
  "npm run pay:growth-loop-check",
  "npm run pay:measured-loop-implementation-check",
  "npm run pay:counterparty-activation-check",
  "npm run pay:committed-checkout-acceptance-check",
  "npm run pay:merchant-api-check",
  "npm run pay:receipt-public-view-check",
  "npm run pay:status-json",
  "npm run pay:verify",
]);
discovery.payGrowthLoopDiscovery?.verificationCommands?.forEach((command, index) =>
  assertSafeNpmRunCommand(command, `discovery.payGrowthLoopDiscovery.verificationCommands[${index}]`),
);
assert.ok(
  discovery.payGrowthLoopDiscovery?.claimBoundary?.includes("live redacted first-party"),
  "Pay growth-loop discovery must preserve live redacted measurement boundary.",
);
assert.ok(
  discovery.payGrowthLoopDiscovery?.claimBoundary?.includes("no live adoption"),
  "Pay growth-loop discovery must block live-adoption claims.",
);

assert.equal(
  discovery.payMeasuredLoopImplementation?.schemaVersion,
  "vanta-pay-measured-loop-implementation-v0.1",
);
assert.equal(discovery.payMeasuredLoopImplementation?.object, "pay_measured_loop_implementation");
assert.equal(
  discovery.payMeasuredLoopImplementation?.status,
  "implemented-live-redacted-claim-blocked",
);
assert.equal(discovery.payMeasuredLoopImplementation?.measurementMode, "live-redacted-first-party");
assert.equal(discovery.payMeasuredLoopImplementation?.liveMeasurementEnabled, true);
assert.equal(
  discovery.payMeasuredLoopImplementation?.implementedSurfaces?.operatorStatusEndpoint,
  "GET /v1/growth-loop/status",
);
assert.equal(
  discovery.payMeasuredLoopImplementation?.implementedSurfaces?.eventIntakeEndpoint,
  "POST /v1/growth-loop/events",
);
assert.equal(
  discovery.payMeasuredLoopImplementation?.implementedSurfaces?.runtimeRedactedEventLedger,
  true,
);
assert.equal(
  discovery.payMeasuredLoopImplementation?.implementedSurfaces?.counterpartyActivationSurface,
  true,
);
assert.equal(
  discovery.payMeasuredLoopImplementation?.implementedSurfaces?.committedCheckoutAcceptanceSurface,
  true,
);
assert.equal(
  discovery.payMeasuredLoopImplementation?.implementedSurfaces?.automaticReceiptGeneratedEvent,
  true,
);
assert.equal(discovery.payMeasuredLoopImplementation?.privacyBoundary?.customerEmailStored, false);
assert.equal(discovery.payMeasuredLoopImplementation?.privacyBoundary?.privateInputsStored, false);
assert.equal(discovery.payMeasuredLoopImplementation?.privacyBoundary?.witnessStored, false);
assert.equal(discovery.payMeasuredLoopImplementation?.claimControls?.adoptionClaimAllowed, false);
assert.equal(discovery.payMeasuredLoopImplementation?.claimControls?.productionReady, false);
assert.equal(discovery.payMeasuredLoopImplementation?.claimControls?.anonymityClaimAllowed, false);
assert.equal(
  discovery.payMeasuredLoopImplementation?.claimControls?.claimLiftBlockedUntilReviewedLiveEvidence,
  true,
);
assert.ok(
  discovery.payMeasuredLoopImplementation?.truthBoundary?.includes("not an adoption"),
  "Pay measured-loop implementation must block adoption claims.",
);
discovery.payMeasuredLoopImplementation?.verificationCommands?.forEach((command, index) =>
  assertSafeNpmRunCommand(command, `discovery.payMeasuredLoopImplementation.verificationCommands[${index}]`),
);

assert.equal(
  discovery.payCounterpartyActivation?.schemaVersion,
  "vanta-pay-counterparty-activation-v0.1",
);
assert.equal(discovery.payCounterpartyActivation?.object, "pay_counterparty_activation");
assert.equal(
  discovery.payCounterpartyActivation?.status,
  "actionable-live-redacted-claim-blocked",
);
assert.equal(
  discovery.payCounterpartyActivation?.activationMode,
  "receipt-bound-counterparty-next-action",
);
assert.equal(discovery.payCounterpartyActivation?.measurementMode, "live-redacted-first-party");
assert.equal(discovery.payCounterpartyActivation?.liveMeasurementEnabled, true);
assert.deepEqual(discovery.payCounterpartyActivation?.activationEventTypes, [
  "counterparty_invite_created",
  "counterparty_invite_opened",
  "next_settlement_intent_created",
]);
assert.equal(
  discovery.payCounterpartyActivation?.primaryAction?.nextAction,
  "request_next_private_settlement",
);
assert.equal(
  discovery.payCounterpartyActivation?.primaryAction?.eventType,
  "next_settlement_intent_created",
);
assert.equal(discovery.payCounterpartyActivation?.primaryAction?.route, "/app/pay");
assert.equal(
  discovery.payCounterpartyActivation?.measurement?.eventIntakeEndpoint,
  "POST /v1/growth-loop/events",
);
assert.equal(
  discovery.payCounterpartyActivation?.measurement?.statusEndpoint,
  "GET /v1/growth-loop/status",
);
assert.equal(discovery.payCounterpartyActivation?.measurement?.noCustomerEmailValue, true);
assert.equal(discovery.payCounterpartyActivation?.measurement?.noIpAddressOrUserAgent, true);
assert.equal(discovery.payCounterpartyActivation?.privacyBoundary?.customerEmailStored, false);
assert.equal(discovery.payCounterpartyActivation?.privacyBoundary?.privateInputsStored, false);
assert.equal(discovery.payCounterpartyActivation?.claimControls?.adoptionClaimAllowed, false);
assert.equal(discovery.payCounterpartyActivation?.claimControls?.productionReady, false);
assert.equal(discovery.payCounterpartyActivation?.claimControls?.anonymityClaimAllowed, false);
assert.equal(
  discovery.payCounterpartyActivation?.claimControls?.claimLiftBlockedUntilReviewedLiveEvidence,
  true,
);
assert.ok(
  discovery.payCounterpartyActivation?.truthBoundary?.includes("not an adoption"),
  "Pay counterparty activation must block adoption claims.",
);
discovery.payCounterpartyActivation?.verificationCommands?.forEach((command, index) =>
  assertSafeNpmRunCommand(command, `discovery.payCounterpartyActivation.verificationCommands[${index}]`),
);

assert.equal(
  discovery.payCommittedCheckoutAcceptance?.schemaVersion,
  "vanta-pay-committed-checkout-acceptance-v0.1",
);
assert.equal(discovery.payCommittedCheckoutAcceptance?.object, "pay_committed_checkout_acceptance");
assert.equal(
  discovery.payCommittedCheckoutAcceptance?.status,
  "acceptance-ready-live-redacted-claim-blocked",
);
assert.equal(
  discovery.payCommittedCheckoutAcceptance?.acceptanceMode,
  "receipt-bound-committed-economics-acceptance",
);
assert.equal(
  discovery.payCommittedCheckoutAcceptance?.acceptanceAction?.eventType,
  "committed_checkout_acceptance_created",
);
assert.equal(
  discovery.payCommittedCheckoutAcceptance?.acceptanceAction?.nextAction,
  "accept_committed_checkout_private_settlement",
);
assert.equal(
  discovery.payCommittedCheckoutAcceptance?.acceptedPrivateSettlement?.economicsMode,
  "committed-economics",
);
assert.equal(
  discovery.payCommittedCheckoutAcceptance?.acceptedPrivateSettlement
    ?.rawEconomicTermsInAcceptedCheckoutSettlement,
  false,
);
assert.equal(
  discovery.payCommittedCheckoutAcceptance?.privacyBoundary?.rawFutureSettlementTermsStored,
  false,
);
assert.equal(discovery.payCommittedCheckoutAcceptance?.claimControls?.adoptionClaimAllowed, false);
assert.equal(discovery.payCommittedCheckoutAcceptance?.claimControls?.productionReady, false);
assert.equal(discovery.payCommittedCheckoutAcceptance?.claimControls?.anonymityClaimAllowed, false);
assert.equal(
  discovery.payCommittedCheckoutAcceptance?.claimControls
    ?.claimLiftBlockedUntilReviewedLiveEvidence,
  true,
);
assert.ok(
  discovery.payCommittedCheckoutAcceptance?.truthBoundary?.includes("does not execute a settlement"),
  "Pay committed checkout acceptance must block execution claims.",
);
discovery.payCommittedCheckoutAcceptance?.verificationCommands?.forEach((command, index) =>
  assertSafeNpmRunCommand(
    command,
    `discovery.payCommittedCheckoutAcceptance.verificationCommands[${index}]`,
  ),
);

assert.equal(auditAlias.schemaVersion, "vanta-public-audit-alias-0.1");
assert.equal(auditAlias.path, "/.well-known/audit");
assert.equal(auditAlias.canonicalDiscovery, "/.well-known/vanta-audit.json");
assert.equal(auditAlias.refsOnly, true);
assert.equal(auditAlias.auditClaimAllowed, false);
assert.equal(auditAlias.thirdPartyAuditAccepted, false);
assert.equal(auditAlias.productionReady, false);
assert.equal(auditAlias.mainnetReady, false);
assert.equal(auditAlias.liveDeploymentVerified, false);
assert.equal(auditAlias.privacyClaimAllowed, false);
assert.equal(auditAlias.anonymityClaimAllowed, false);
assert.ok(
  auditAlias.currentBlockers?.includes("See /.well-known/vanta-audit.json for current blocked gates."),
  "Audit alias must point at canonical blocked gates.",
);

assert.equal(discovery.securityLimitations, "SECURITY_LIMITATIONS.md");
assert.equal(discovery.auditPackage, "docs/audit-package.md");
assert.equal(discovery.findingLedger, "VANTA_ZK_REVIEW.findings.json");
assert.equal(
  discovery.proofBoundaries?.c01VerifierBackendDecision,
  "docs/zk/c01-production-verifier-backend-decision.md",
);
assert.equal(
  discovery.proofBoundaries?.c01VerifierCandidateEvidence,
  "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json",
);
assert.equal(
  discovery.proofBoundaries?.c01VerifierAdapterTestCandidateEvidence,
  "ops/mainnet/private-pool-v2-c01-verifier-adapter-test-candidate.evidence.json",
);
assert.equal(
  discovery.proofBoundaries?.c01PositiveProofVerifiedClaimGateEvidence,
  "ops/mainnet/private-pool-v2-c01-positive-proof-verified-claim-gate.evidence.json",
);
assert.equal(discovery.proofBoundaries?.offchainProofArtifactOnly, true);
assert.equal(discovery.proofBoundaries?.solanaC01Groth16VerifierReady, false);
assert.equal(discovery.proofBoundaries?.productionVerifierBackendSelected, false);

assert.deepEqual(discovery.intakeTemplates, [
  "ops/mainnet/audit-review.packet.template.json",
  "ops/mainnet/legal-compliance-custody.packet.template.json",
  "ops/mainnet/production-key-custody.template.json",
]);

for (const ref of requiredRefs) {
  assert.ok(discoverySource.includes(ref), `Discovery JSON must include required ref: ${ref}`);
  assertRelativeRepoRef(ref);
}

const publicDepthBlocker = discovery.currentBlockers?.find(
  (blocker) => blocker?.id === "public-anonymity-depth",
);
assert.ok(publicDepthBlocker, "Discovery JSON must include public-anonymity-depth blocker.");
assert.equal(publicDepthBlocker.status, "blocked");
assert.equal(publicDepthBlocker.currentDistinctCommitments, 2);
assert.equal(publicDepthBlocker.minimumDistinctCommitments, 1024);
assert.equal(
  publicDepthBlocker.evidenceRef,
  "ops/mainnet/private-pool-v2-anonymity-set.evidence.json",
);

for (const id of ["audit-acceptance", "production-verifier", "live-deployment-evidence"]) {
  assert.ok(
    discovery.currentBlockers?.some((blocker) => blocker?.id === id && blocker.status === "blocked"),
    `Discovery JSON must preserve blocker: ${id}`,
  );
}
const productionVerifierBlocker = discovery.currentBlockers?.find(
  (blocker) => blocker?.id === "production-verifier",
);
assert.equal(
  productionVerifierBlocker?.evidenceRef,
  "ops/mainnet/private-pool-v2-c01-verifier-candidate.evidence.json",
);
const liveDeploymentBlocker = discovery.currentBlockers?.find(
  (blocker) => blocker?.id === "live-deployment-evidence",
);
assert.ok(
  liveDeploymentBlocker?.claim?.includes("Website audit and copy surfaces have a last-verified deploy receipt"),
  "Live-deployment blocker must distinguish website live evidence from private-settlement/SBF deployment blockers.",
);
assert.ok(
  liveDeploymentBlocker?.claim?.includes("private settlement, SBF, verifier, custody, and anonymity deployment evidence remains blocked"),
  "Live-deployment blocker must preserve the remaining private-settlement/SBF deployment boundary.",
);

for (const command of [
  "npm run public:audit-discovery-check",
  "npm run audit:package-check",
  "npm run pay:growth-loop-check",
  "npm run pay:measured-loop-implementation-check",
  "npm run pay:counterparty-activation-check",
  "npm run pay:committed-checkout-acceptance-check",
  "npm run pay:merchant-api-check",
  "npm run pay:receipt-public-view-check",
  "npm run pay:status-json",
  "npm run pay:verify",
  "npm run zk:c01-production-verifier-backend-candidate-check",
  "npm run zk:c01-verifier-adapter-test-candidate-check",
  "npm run zk:c01-positive-proof-verified-claim-gate-check",
  "npm run zk:feedback-loop-check",
  "npm run truth:privacy-claim-gate",
  "npm run build",
]) {
  assert.ok(discovery.safeCommands?.includes(command), `Discovery JSON must include command: ${command}`);
}

discovery.safeCommands?.forEach((command, index) =>
  assertSafeNpmRunCommand(command, `discovery.safeCommands[${index}]`),
);
auditAlias.safeCommands?.forEach((command, index) =>
  assertSafeNpmRunCommand(command, `auditAlias.safeCommands[${index}]`),
);

for (const phrase of [
  "/.well-known/vanta-audit.json",
  "/.well-known/audit",
  "alias",
  "refs-only public discovery",
  "auditClaimAllowed: false",
  "productionReady: false",
  "mainnetReady: false",
  "npm run public:audit-discovery-check",
  "not an audit report",
  "not third-party approval",
  "not production readiness",
  "payGrowthLoopDiscovery",
  "payMeasuredLoopImplementation",
  "payCounterpartyActivation",
  "payCommittedCheckoutAcceptance",
  "vanta-pay-growth-loop-discovery-0.1",
  "vanta-pay-growth-loop-evidence-v0.1",
  "vanta-pay-live-growth-loop-measurement-v0.1",
  "vanta-pay-measured-loop-implementation-v0.1",
  "vanta-pay-counterparty-activation-v0.1",
  "vanta-pay-committed-checkout-acceptance-v0.1",
  "live redacted first-party measurement",
  "counterparty verifier route",
  "npm run pay:growth-loop-check",
  "npm run pay:measured-loop-implementation-check",
  "npm run pay:counterparty-activation-check",
  "npm run pay:committed-checkout-acceptance-check",
  "live event intake stores only redacted event metadata",
  "no live adoption",
]) {
  assert.ok(auditPackage.includes(phrase), `docs/audit-package.md is missing public discovery phrase: ${phrase}`);
}

const forbiddenClaimPhrases = [
  "audited",
  "certified",
  "third-party approved",
  "production-ready",
  "mainnet-ready",
  "fully private",
  "anonymous settlement",
  "untraceable",
];

const lowerDiscovery = discoverySource.toLowerCase();
for (const phrase of forbiddenClaimPhrases) {
  assert.ok(!lowerDiscovery.includes(phrase), `Discovery JSON must not overclaim with phrase: ${phrase}`);
  assert.ok(!auditAliasSource.toLowerCase().includes(phrase), `Audit alias must not overclaim with phrase: ${phrase}`);
}

const forbiddenContentPatterns = [
  /\bprivate[_ -]?key\b/iu,
  /\bseed[_ -]?phrase\b/iu,
  /\bmnemonic\b/iu,
  /\bsecret[_ -]?value\b/iu,
  /\bsigned[_ -]?transaction(?:[_ -]?bytes?)?\b/iu,
  /\bcustomer[_ -]?private[_ -]?inputs?\b/iu,
  /\breport[_ -]?bod(?:y|ies)\b/iu,
  /\blegal[_ -]?text\b/iu,
  /\braw[_ -]?witness\b/iu,
  /\bwitness[_ -]?material\b/iu,
  /\bprovider[_ -]?credentials?\b/iu,
  /\blive[_ -]?provider\b/iu,
  /\bunder[_ -]?nda\b/iu,
];

const secretValuePatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\bBearer\s+[A-Za-z0-9._=-]{20,}\b/u,
  /\b(?:sk|pk|secret|api[_-]?key|token)_(?:live|prod|mainnet)_[A-Za-z0-9]{12,}\b/u,
  /\b(?:gh[pousr]|xox[baprs])[-_][A-Za-z0-9_-]{20,}\b/u,
];

walk(discovery, (value, path) => {
  if (typeof value !== "string") {
    return;
  }
  for (const forbidden of forbiddenContentPatterns) {
    assert.ok(
      !forbidden.test(value),
      `Discovery JSON must not include secret/report/witness content marker at ${path}; use refs-only metadata.`,
    );
  }
  for (const pattern of secretValuePatterns) {
    assert.ok(
      !pattern.test(value),
      `Discovery JSON appears to include a secret-shaped value at ${path}; use refs-only metadata.`,
    );
  }
});

walk(auditAlias, (value, path) => {
  if (typeof value !== "string") {
    return;
  }
  for (const forbidden of forbiddenContentPatterns) {
    assert.ok(
      !forbidden.test(value),
      `Audit alias must not include secret/report/witness content marker at ${path}; use refs-only metadata.`,
    );
  }
  for (const pattern of secretValuePatterns) {
    assert.ok(
      !pattern.test(value),
      `Audit alias appears to include a secret-shaped value at ${path}; use refs-only metadata.`,
    );
  }
});

walkRepoRefs(discovery);

console.log("Vanta public audit discovery check: PASS");
