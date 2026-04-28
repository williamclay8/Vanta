import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-shield-committed-settlement-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const sourceFiles = [
  "privacy/privatePoolV2ProtocolSettlementClient.ts",
  "privacy/vantaShieldCommittedSettlement.ts",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function copySource(relativePath) {
  mkdirSync(join(tempTsDir, relativePath, ".."), { recursive: true });
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src", relativePath), "utf8"),
  );
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8")
    .replace(/from "((?:\.\.?\/)[^"]+)\.ts"/g, 'from "$1.js"')
    .replace(/from "((?:\.\.?\/)[^"]+)(?<!\.js)"/g, 'from "$1.js"');
  writeFileSync(filePath, source);
}

function assertNoRawTerms(value, rawTerms) {
  const serialized = JSON.stringify(value);
  for (const rawTerm of rawTerms) {
    assert(!serialized.includes(rawTerm), `Committed Shield request leaked raw term: ${rawTerm}`);
  }
}

try {
  mkdirSync(tempTsDir, { recursive: true });
  for (const file of sourceFiles) {
    copySource(file);
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((file) => join(tempTsDir, file)),
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--lib",
      "ES2022,DOM",
      "--skipLibCheck",
      "--rootDir",
      tempTsDir,
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }

  const {
    createVantaShieldCommittedEconomicsSettlement,
    createVantaShieldCommittedEconomicsSettlementRequest,
    VANTA_SHIELD_COMMITTED_SETTLEMENT_VERSION,
    verifyVantaShieldCommittedEconomicsSettlementOpening,
  } = await import(pathToFileURL(join(tempJsDir, "privacy/vantaShieldCommittedSettlement.js")).href);

  assert(
    VANTA_SHIELD_COMMITTED_SETTLEMENT_VERSION === "vanta-shield-committed-settlement-0.1",
    "Expected stable Shield committed-settlement version.",
  );

  const committedSettlement = createVantaShieldCommittedEconomicsSettlement({
    amount: "12.00",
    depositSignature: "shield-deposit-signature-raw",
    owner: "owner-public-key-raw",
    routeEvidence: {
      provider: "jupiter",
      routeSignature: "route-signature-raw",
      sourceAmount: "12.00",
      sourceAsset: "BONK",
      sourceMintAddress: "mint:bonk",
      targetAmount: "10.50",
      targetAsset: "USDC",
      targetMintAddress: "mint:usdc",
    },
    settlementId: "shield-state-signature-raw",
    shieldCapability: {
      blockers: [],
      mode: "route-to-configured-shield-token",
      requiresPublicRoute: true,
      sourceAsset: {
        mintAddress: "mint:bonk",
        symbol: "BONK",
      },
      supportsDirectShield: false,
      targetShieldAsset: {
        assetKey: "USDC",
        label: "Shielded USDC",
        mintAddress: "mint:usdc",
        name: "USD Coin",
      },
    },
    sourceAsset: "BONK",
    vaultOwner: "vault-owner-raw",
  });
  const committedRequest = committedSettlement.request;

  assert(committedRequest.action === "shield", "Expected committed Shield request action.");
  assert(
    committedRequest.economicsMode === "committed-economics",
    "Expected committed Shield request to use committed-economics mode.",
  );
  for (const field of [
    "economicsCommitment",
    "nullifierOrReplayCommitment",
    "ownerCommitment",
    "routeCommitment",
    "settlementCommitment",
    "settlementId",
  ]) {
    assert(
      typeof committedRequest[field] === "string" && committedRequest[field].startsWith("0x"),
      `Expected committed Shield request ${field}.`,
    );
  }

  for (const forbiddenField of [
    "amount",
    "asset",
    "destination",
    "owner",
    "shieldCapability",
    "shieldSettlementEvidence",
    "shieldRouteEvidence",
  ]) {
    assert(!(forbiddenField in committedRequest), `Committed Shield request leaked ${forbiddenField}.`);
  }

  assertNoRawTerms(committedRequest, [
    "12.00",
    "10.50",
    "BONK",
    "USDC",
    "mint:bonk",
    "mint:usdc",
    "route-signature-raw",
    "shield-deposit-signature-raw",
    "shield-state-signature-raw",
    "owner-public-key-raw",
    "vault-owner-raw",
  ]);
  assert(
    verifyVantaShieldCommittedEconomicsSettlementOpening(committedSettlement),
    "Expected committed Shield opening to verify.",
  );
  assert(
    committedSettlement.opening.source?.nonce instanceof Uint8Array,
    "Expected committed Shield opening to retain source nonce.",
  );
  assert(
    committedSettlement.opening.source?.preimageParts?.includes("BONK"),
    "Expected committed Shield source opening to retain canonical source preimage.",
  );

  const badAmountOpening = structuredClone(committedSettlement.opening);
  badAmountOpening.source.preimageParts = ["source", "BONK", "mint:bonk", "13.00"];
  assert(
    !verifyVantaShieldCommittedEconomicsSettlementOpening({
      request: committedRequest,
      opening: badAmountOpening,
    }),
    "Expected changed source amount opening to fail verification.",
  );

  const badRouteOpening = structuredClone(committedSettlement.opening);
  badRouteOpening.route.preimageParts = [
    "route",
    "jupiter",
    "tampered-route-signature",
    "12.00",
    "BONK",
    "mint:bonk",
    "10.50",
    "USDC",
    "mint:usdc",
  ];
  assert(
    !verifyVantaShieldCommittedEconomicsSettlementOpening({
      request: committedRequest,
      opening: badRouteOpening,
    }),
    "Expected changed route opening to fail verification.",
  );

  const badOwnerOpening = structuredClone(committedSettlement.opening);
  badOwnerOpening.owner.preimageParts = ["owner", "other-owner", "vault-owner-raw"];
  assert(
    !verifyVantaShieldCommittedEconomicsSettlementOpening({
      request: committedRequest,
      opening: badOwnerOpening,
    }),
    "Expected changed owner opening to fail verification.",
  );

  const badSettlementIdOpening = structuredClone(committedSettlement.opening);
  badSettlementIdOpening.settlementIdPreimageParts = ["other-state-signature"];
  assert(
    !verifyVantaShieldCommittedEconomicsSettlementOpening({
      request: committedRequest,
      opening: badSettlementIdOpening,
    }),
    "Expected changed raw settlement id opening to fail verification.",
  );

  const directRequest = createVantaShieldCommittedEconomicsSettlementRequest({
    amount: "2.00",
    depositSignature: "direct-deposit-signature-raw",
    owner: "direct-owner-raw",
    routeEvidence: null,
    settlementId: "direct-state-signature-raw",
    shieldCapability: {
      blockers: [],
      mode: "direct-configured-token",
      requiresPublicRoute: false,
      sourceAsset: {
        mintAddress: "mint:usdc",
        symbol: "USDC",
      },
      supportsDirectShield: true,
      targetShieldAsset: {
        assetKey: "USDC",
        label: "Shielded USDC",
        mintAddress: "mint:usdc",
        name: "USD Coin",
      },
    },
    sourceAsset: "USDC",
    vaultOwner: "direct-vault-owner-raw",
  });

  assert(directRequest.action === "shield", "Expected direct committed Shield request action.");
  assertNoRawTerms(directRequest, [
    "2.00",
    "USDC",
    "mint:usdc",
    "direct-deposit-signature-raw",
    "direct-state-signature-raw",
    "direct-owner-raw",
    "direct-vault-owner-raw",
  ]);

  console.log("vanta Shield committed-settlement request: PASS");
} catch (error) {
  const stdout = String(error.stdout ?? "");
  const stderr = String(error.stderr ?? "");
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
