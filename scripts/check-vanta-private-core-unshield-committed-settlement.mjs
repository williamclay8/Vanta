import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const contextSource = readFileSync(
  resolve(repoRoot, "src/data/context/PrivacyFlowContext.tsx"),
  "utf8",
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractRunPrivateCoreUnshieldSource() {
  const marker = "const runPrivateCoreUnshield = useCallback(async (): Promise<VantaPrivateCoreUnshieldState> => {";
  const start = contextSource.indexOf(marker);
  assert(start >= 0, "Expected to find runPrivateCoreUnshield.");

  const nextCallback = contextSource.indexOf("\n  const ", start + marker.length);
  assert(nextCallback > start, "Expected to find the end of runPrivateCoreUnshield.");

  return contextSource.slice(start, nextCallback);
}

function extractProtocolSettlementCall(source) {
  const marker = "recordPrivatePoolV2ProtocolSettlement({";
  const start = source.indexOf(marker);
  assert(start >= 0, "Expected private-core unshield to record a Private Pool v2 settlement.");

  let depth = 0;
  for (let index = start + marker.length - 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  throw new Error("Expected to parse the private-core unshield settlement call.");
}

try {
  const runSource = extractRunPrivateCoreUnshieldSource();
  const settlementCall = extractProtocolSettlementCall(runSource);

  assert(
    settlementCall.includes('action: "unshield"'),
    "Expected the private-core unshield settlement call to preserve unshield action.",
  );
  assert(
    settlementCall.includes('economicsMode: "committed-economics"'),
    "Expected private-core unshield to use committed economics settlement mode.",
  );

  for (const rawField of ["amount:", "asset:", "destination:", "owner:"]) {
    assert(
      !settlementCall.includes(rawField),
      `Private-core unshield committed settlement must not pass raw ${rawField.slice(0, -1)}.`,
    );
  }

  for (const committedField of [
    "economicsCommitment:",
    "exitTermsCommitment:",
    "inputCommitment:",
    "inputRoot:",
    "nullifierOrReplayCommitment:",
    "ownerCommitment:",
    "proofBoundDestinationCommitment:",
    "routeCommitment:",
    "settlementCommitment:",
    "unshieldContextTag:",
    "unshieldPublicInputHash:",
  ]) {
    assert(
      settlementCall.includes(committedField),
      `Expected private-core unshield committed settlement to include ${committedField.slice(0, -1)}.`,
    );
  }

  console.log("private-core unshield committed settlement bridge: PASS");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
