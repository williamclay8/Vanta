import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const checkMode = args.includes("--check");
const explicitBaseUrl = resolveBaseUrl(args);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function randomPort() {
  return 11450 + Math.floor(Math.random() * 200);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function createOperatorEnv(tempRoot, port) {
  return {
    ...process.env,
    PATH: `${process.env.HOME}/.nargo/bin:${process.env.PATH ?? ""}`,
    VANTA_UNSHIELD_OPERATOR_PORT: String(port),
    VANTA_MAINNET_TOKEN_MINT:
      process.env.VANTA_MAINNET_TOKEN_MINT ??
      "8j9mJY4hPW4N1pQ6XJk4oL9bQ4u8sF3o6T2jW7vF6dEm",
    VANTA_MAINNET_VAULT_OWNER:
      process.env.VANTA_MAINNET_VAULT_OWNER ??
      "Gk7m3rV2Q5uH4pL9sW8xD1nB6cT3yF7kJ2qR5mN8pZ1",
    VANTA_PRIVATE_CORE_CONSUME_STORE_PATH: join(tempRoot, "consumes.json"),
    VANTA_PRIVATE_CORE_PROOF_STORE_PATH: join(tempRoot, "proofs.json"),
    VANTA_PRIVATE_CORE_SEND_PROOF_STORE_PATH: join(tempRoot, "send-proofs.json"),
    VANTA_PRIVATE_CORE_SWAP_PROOF_STORE_PATH: join(tempRoot, "swap-proofs.json"),
    VANTA_PRIVATE_CORE_SEND_STORE_PATH: join(tempRoot, "sends.json"),
    VANTA_PRIVATE_CORE_SWAP_STORE_PATH: join(tempRoot, "private-core-swaps.json"),
    VANTA_PRIVATE_CORE_RELEASE_STORE_PATH: join(tempRoot, "private-core-releases.json"),
    VANTA_PRIVATE_CORE_ROOT_STORE_PATH: join(tempRoot, "roots.json"),
    VANTA_RELEASE_RECORD_STORE_PATH: join(tempRoot, "releases.json"),
    VANTA_SWAP_RECORD_STORE_PATH: join(tempRoot, "live-swaps.json"),
    VANTA_SOL_UNSHIELD_RECORD_STORE_PATH: join(tempRoot, "sol-unshields.json"),
  };
}

function startOperator(tempRoot, port) {
  const server = spawn("node", ["operator/unshield-server.mjs"], {
    cwd: repoRoot,
    env: createOperatorEnv(tempRoot, port),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk.toString("utf8");
  });
  server.stderr.on("data", (chunk) => {
    output += chunk.toString("utf8");
  });
  return {
    output: () => output.trim(),
    server,
  };
}

async function stopOperator(server) {
  server.kill("SIGTERM");
  await new Promise((resolvePromise) => {
    server.once("exit", () => resolvePromise(undefined));
    setTimeout(() => resolvePromise(undefined), 1000);
  });
}

async function waitForStatus(baseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await requestJson(baseUrl, "/state/private-core-status");
      if (response.ok) {
        return response.parsed;
      }
    } catch {
      // Retry while the temporary operator starts.
    }

    await sleep(250);
  }

  throw new Error("private-core status endpoint did not become ready in time.");
}

async function requestJson(baseUrl, path) {
  const authToken = resolveAuthToken();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    method: "GET",
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  let parsed = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  return {
    ok: response.ok,
    parsed,
    status: response.status,
    text,
  };
}

function buildSwapTrustPacket({ baseUrl, status }) {
  const summary = status?.summary ?? {};
  const latestSwap = summary.latestSwap ?? null;
  const latestSwapProof = summary.latestSwapLinkedProof ?? summary.latestSwapProof ?? null;
  const resultingRootRecord = summary.swapResultingRootRecord ?? null;
  const proofBacked = Boolean(
    latestSwapProof?.proofId &&
      latestSwap?.proofId &&
      latestSwapProof.proofId === latestSwap.proofId &&
      latestSwapProof.verified === true &&
      summary.proofSwapLinkStatus === "linked" &&
      summary.swapBoundaryStatus === "ready" &&
      summary.swapResultingRootProofLinkStatus === "linked",
  );
  const evidenceStatus = proofBacked
    ? "proof-linked-swap-transition-observed"
    : "no-current-swap-proof-evidence";

  return {
    version: "vanta-swap-trust-packet-0.1",
    kind: "swap-trust-packet",
    operator: baseUrl,
    generatedAt: new Date().toISOString(),
    command: {
      human: "npm run swap:trust-packet",
      json: "npm run swap:trust-packet-json",
      check: "npm run swap:trust-packet-check",
    },
    claimBoundary: {
      privacyTier: "v1.5-hash-bound-public-request-terms",
      proofBacked,
      evidenceStatus,
      committedSettlementBridge: "swap:committed-settlement-check",
      fullyPrivate: false,
      productionReady: false,
      safeClaim:
        proofBacked
          ? "Proof-linked constrained Swap transition with commitment-oriented reviewer packet; not fully private or production-ready."
          : "No current Swap proof evidence is available from the operator; this packet is a commitment-oriented readiness surface, not a proof-backed Swap claim.",
    },
    lane: {
      environment: summary.supportedEnvironment ?? null,
      status: summary.supportedSwapLaneStatus ?? null,
      kind: summary.supportedSwapLaneKind ?? null,
      role: summary.supportedSwapV1Role ?? null,
      venuePolicy: summary.supportedSwapVenue ?? null,
      outputModel: summary.supportedSwapOutputModel ?? null,
      inputRootPolicy: summary.supportedSwapInputRootPolicy ?? null,
      outputRegistrationPolicy: summary.supportedSwapOutputRegistrationPolicy ?? null,
    },
    latestTransition: latestSwap
      ? {
          swapId: latestSwap.swapId ?? null,
          proofId: latestSwap.proofId ?? null,
          inputRoot: latestSwap.inputRoot ?? null,
          inputNullifier: latestSwap.inputNullifier ?? null,
          outputCommitment: latestSwap.outputCommitment ?? null,
          resultingRoot: latestSwap.resultingRoot ?? null,
          resultingRootBasis: latestSwap.resultingRootBasis ?? null,
          economicsCommitment: latestSwap.economicsCommitment ?? null,
          settlementCommitment: latestSwap.settlementCommitment ?? null,
          routeCommitment: commitmentFromParts("swap-route", [
            latestSwap.executionVenueLabel,
            latestSwap.executionQuoteReference,
          ]),
          quoteReferenceCommitment:
            typeof latestSwap.executionQuoteReference === "string"
              ? commitmentFromParts("swap-quote-reference", [latestSwap.executionQuoteReference])
              : null,
          venueLabelCommitment:
            typeof latestSwap.executionVenueLabel === "string"
              ? commitmentFromParts("swap-venue-label", [latestSwap.executionVenueLabel])
              : null,
          quoteExpiresAt: latestSwap.quoteExpiresAt ?? null,
        }
      : null,
    proof: latestSwapProof
      ? {
          proofId: latestSwapProof.proofId ?? null,
          action: latestSwapProof.action ?? null,
          circuit: latestSwapProof.circuit ?? null,
          backend: latestSwapProof.backend ?? null,
          provingHashLane: latestSwapProof.provingHashLane ?? null,
          verified: latestSwapProof.verified === true,
          publicInputCount: latestSwapProof.publicInputCount ?? null,
          proofFieldCount: latestSwapProof.proofFieldCount ?? null,
        }
      : null,
    operatorChecks: {
      proofSwapLinkStatus: summary.proofSwapLinkStatus ?? null,
      swapBoundaryStatus: summary.swapBoundaryStatus ?? null,
      swapBoundaryNote: summary.swapBoundaryNote ?? null,
      swapContinuityStatus: summary.swapContinuityStatus ?? null,
      swapContinuityNote: summary.swapContinuityNote ?? null,
      swapResultingRootStatus: summary.swapResultingRootStatus ?? null,
      swapResultingRootNote: summary.swapResultingRootNote ?? null,
      swapResultingRootRegistrationStatus: summary.swapResultingRootRegistrationStatus ?? null,
      swapResultingRootRegistrationNote: summary.swapResultingRootRegistrationNote ?? null,
      swapResultingRootProofLinkStatus: summary.swapResultingRootProofLinkStatus ?? null,
      resultingRootRecord: resultingRootRecord
        ? {
            root: resultingRootRecord.root ?? null,
            proofId: resultingRootRecord.proofId ?? null,
            registrationBasis: resultingRootRecord.registrationBasis ?? null,
            artifactBundleStatus: resultingRootRecord.artifactBundleStatus ?? null,
          }
        : null,
    },
    privacyDisclosure: {
      visibleInPacket: [
        "proof id",
        "input root",
        "input nullifier",
        "output commitment",
        "resulting root",
        "route commitment",
        "operator link and continuity statuses",
      ],
      notIncludedByDefault: [
        "raw input amount",
        "raw output amount",
        "raw input asset id",
        "raw output asset id",
        "wallet owner",
        "vault owner",
        "private witness material",
      ],
      operatorVisibleRawEconomics: [
        "raw input/output amounts remain operator-visible in private-core swap-transition records",
        "route adapter and live venue paths can still see raw input/output assets, quote id, route, slippage, and pool metadata",
        "public SPL memo beta execution still serializes raw swap terms until commitment-only swap memos replace it",
      ],
      localPrivacyPrimitives: [
        "swap-to-shielded proof request",
        "swap-to-shielded executable circuit fixture",
        "committed-economics protocol settlement receipt",
        "atomic local verifier/indexer nullifier registration and output append",
      ],
      remainingBlockers: [
        "quote and route privacy before operator settlement",
        "relayer separation",
        "live venue privacy",
        "production root/nullifier durability with reviewed replay rejection",
        "safe logging and indexer evidence",
        "anonymity-set readiness",
        "production evidence",
        "proof coverage is limited to local/operator-linked transition evidence; quote route, live venue privacy, anonymity set, and production settlement remain unproven",
        "audited prover/verifier key boundary",
        "fresh bounded real-funds approval for the exact Swap action",
      ],
    },
  };
}

function validateSwapTrustPacket(packet) {
  assert(packet.version === "vanta-swap-trust-packet-0.1", "Unexpected Swap packet version.");
  assert(packet.kind === "swap-trust-packet", "Unexpected Swap packet kind.");
  assert(packet.claimBoundary.fullyPrivate === false, "Swap packet must not claim full privacy.");
  assert(packet.claimBoundary.productionReady === false, "Swap packet must not claim production readiness.");
  assert(
    packet.claimBoundary.privacyTier === "v1.5-hash-bound-public-request-terms",
    "Swap packet must preserve the current v1.5 privacy tier.",
  );
  assert(
    packet.command.check === "npm run swap:trust-packet-check",
    "Swap packet must expose the reviewer check command.",
  );
  assert(
    packet.claimBoundary.evidenceStatus ===
      (packet.claimBoundary.proofBacked
        ? "proof-linked-swap-transition-observed"
        : "no-current-swap-proof-evidence"),
    "Swap packet evidence status must match proof-backed truth.",
  );
  if (!packet.claimBoundary.proofBacked) {
    assert(
      packet.claimBoundary.safeClaim.includes("No current Swap proof evidence"),
      "Swap packet must not claim proof-backed Swap when no linked proof evidence is available.",
    );
  }
  if (packet.latestTransition) {
    for (const field of [
      "quoteExpiresAt",
      "economicsCommitment",
      "settlementCommitment",
      "quoteReferenceCommitment",
      "venueLabelCommitment",
    ]) {
      assert(
        field in packet.latestTransition,
        `Swap packet latest transition must expose ${field} when transition evidence exists.`,
      );
    }
  }
  assert(
    packet.privacyDisclosure.localPrivacyPrimitives.includes(
      "atomic local verifier/indexer nullifier registration and output append",
    ),
    "Swap packet must expose the checked local atomic verifier/indexer mutation.",
  );
  assert(
    packet.privacyDisclosure.operatorVisibleRawEconomics.includes(
      "raw input/output amounts remain operator-visible in private-core swap-transition records",
    ),
    "Swap packet must disclose operator-visible raw economics that remain outside the committed packet.",
  );
  assert(
    packet.privacyDisclosure.remainingBlockers.includes(
      "proof coverage is limited to local/operator-linked transition evidence; quote route, live venue privacy, anonymity set, and production settlement remain unproven",
    ),
    "Swap packet must preserve the proof-coverage limitation.",
  );
  assert(
    !packet.privacyDisclosure.remainingBlockers.includes(
      "atomic nullifier registration and swap output commitment append",
    ),
    "Swap packet must not list the checked local atomic mutation as a remaining blocker.",
  );

  const serialized = JSON.stringify(packet);
  for (const forbidden of [
    '"inputAmount"',
    '"outputAmount"',
    '"inputAssetId"',
    '"outputAssetId"',
    '"owner"',
    '"vaultOwner"',
  ]) {
    assert(!serialized.includes(forbidden), `Swap packet must not expose ${forbidden}.`);
  }
  for (const blocker of [
    "quote and route privacy before operator settlement",
    "relayer separation",
    "live venue privacy",
    "anonymity-set readiness",
    "production evidence",
  ]) {
    assert(
      packet.privacyDisclosure.remainingBlockers.includes(blocker),
      `Swap packet must preserve production-private blocker: ${blocker}.`,
    );
  }
}

function validatePackageScripts() {
  const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
  assert(
    packageJson.scripts["swap:trust-packet"] ===
      "node scripts/print-vanta-private-core-swap-trust-packet.mjs",
    "package.json must expose the human Swap trust packet.",
  );
  assert(
    packageJson.scripts["swap:trust-packet-json"] ===
      "node scripts/print-vanta-private-core-swap-trust-packet.mjs --json",
    "package.json must expose the JSON Swap trust packet.",
  );
  assert(
    packageJson.scripts["swap:trust-packet-check"] ===
      "node scripts/print-vanta-private-core-swap-trust-packet.mjs --check",
    "package.json must expose the Swap trust packet check.",
  );
}

function printSwapTrustPacket(packet) {
  console.log("Vanta Swap Trust Packet");
  printLine("Operator", packet.operator);
  printLine("Version", packet.version);
  printLine("Lane", packet.lane.kind ?? "Unavailable");
  printLine("Environment", packet.lane.environment ?? "Unavailable");
  printLine("Venue policy", packet.lane.venuePolicy ?? "Unavailable");
  printLine("Privacy tier", packet.claimBoundary.privacyTier);
  printLine("Evidence status", packet.claimBoundary.evidenceStatus);
  printLine("Safe claim", packet.claimBoundary.safeClaim);
  printLine("Latest swap", packet.latestTransition?.swapId ?? "Unavailable");
  printLine("Proof", packet.proof?.proofId ?? "Unavailable");
  printLine("Input root", abbreviate(packet.latestTransition?.inputRoot));
  printLine("Input nullifier", abbreviate(packet.latestTransition?.inputNullifier));
  printLine("Output commitment", abbreviate(packet.latestTransition?.outputCommitment));
  printLine("Resulting root", abbreviate(packet.latestTransition?.resultingRoot));
  printLine("Route commitment", packet.latestTransition?.routeCommitment ?? "Unavailable");
  printLine("Proof/swap link", packet.operatorChecks.proofSwapLinkStatus ?? "Unavailable");
  printLine("Boundary status", packet.operatorChecks.swapBoundaryStatus ?? "Unavailable");
  printLine("Boundary note", packet.operatorChecks.swapBoundaryNote ?? "Unavailable");
  printLine("Continuity status", packet.operatorChecks.swapContinuityStatus ?? "Unavailable");
  printLine("Continuity note", packet.operatorChecks.swapContinuityNote ?? "Unavailable");
  printLine(
    "Resulting-root registration",
    packet.operatorChecks.swapResultingRootRegistrationStatus ?? "Unavailable",
  );
  printLine("Reviewer check", packet.command.check);
  console.log("Not included by default:");
  for (const item of packet.privacyDisclosure.notIncludedByDefault) {
    console.log(`- ${item}`);
  }
  console.log("Local privacy primitives:");
  for (const item of packet.privacyDisclosure.localPrivacyPrimitives) {
    console.log(`- ${item}`);
  }
  console.log("Remaining blockers:");
  for (const item of packet.privacyDisclosure.remainingBlockers) {
    console.log(`- ${item}`);
  }
}

function printLine(label, value) {
  console.log(`${label}: ${value ?? "Unavailable"}`);
}

function abbreviate(value) {
  if (typeof value !== "string" || value.length === 0) {
    return "Unavailable";
  }
  return value.length > 22 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}

function commitmentFromParts(label, parts) {
  const payload = JSON.stringify({ domain: "vanta.swap.trust-packet.v0", label, parts });
  return `sha256:${createHash("sha256").update(payload).digest("hex")}`;
}

function resolveBaseUrl(cliArgs) {
  const explicitIndex = cliArgs.indexOf("--base-url");
  if (explicitIndex !== -1 && typeof cliArgs[explicitIndex + 1] === "string") {
    return cliArgs[explicitIndex + 1].replace(/\/$/, "");
  }

  const envValue = process.env.VANTA_PRIVATE_CORE_OPERATOR_BASE_URL;
  return typeof envValue === "string" && envValue.trim()
    ? envValue.trim().replace(/\/$/, "")
    : null;
}

function resolveAuthToken() {
  const envValue =
    process.env.VANTA_PRIVATE_CORE_OPERATOR_AUTH_TOKEN ??
    process.env.VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN;
  return typeof envValue === "string" && envValue.trim() ? envValue.trim() : null;
}

let tempRoot = null;
let operator = null;

try {
  let baseUrl = explicitBaseUrl;

  if (!baseUrl) {
    mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
    tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/private-core-swap-trust-packet-"));
    const port = randomPort();
    baseUrl = `http://127.0.0.1:${port}`;
    operator = startOperator(tempRoot, port);
  }

  const status = operator
    ? await waitForStatus(baseUrl)
    : (await requestJson(baseUrl, "/state/private-core-status")).parsed;
  const packet = buildSwapTrustPacket({ baseUrl, status });

  if (checkMode) {
    validatePackageScripts();
    validateSwapTrustPacket(packet);
  }

  if (jsonMode || checkMode) {
    console.log(JSON.stringify(packet, null, 2));
  } else {
    printSwapTrustPacket(packet);
  }
} catch (error) {
  if (operator?.output()) {
    console.error(operator.output());
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (operator) {
    await stopOperator(operator.server);
  }
  if (tempRoot) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
