import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const contextSource = readFileSync(
  resolve(repoRoot, "src/data/context/PrivacyFlowContext.tsx"),
  "utf8",
);
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractRunPrivateCoreSendTransitionSource() {
  const marker = "const runPrivateCoreSendTransition = useCallback(";
  const start = contextSource.indexOf(marker);
  assert(start >= 0, "Expected to find runPrivateCoreSendTransition.");

  const nextCallback = contextSource.indexOf("\n  const ", start + marker.length);
  assert(nextCallback > start, "Expected to find the end of runPrivateCoreSendTransition.");

  return contextSource.slice(start, nextCallback);
}

function extractProtocolSettlementCall(source) {
  const marker = "recordPrivatePoolV2ProtocolSettlement({";
  const start = source.indexOf(marker);
  assert(start >= 0, "Expected private-core send to record a Private Pool v2 settlement.");

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

  throw new Error("Expected to parse the private-core send settlement call.");
}

try {
  const runSource = extractRunPrivateCoreSendTransitionSource();
  const settlementCall = extractProtocolSettlementCall(runSource);

  assert(
    runSource.includes("buildVantaPrivateCoreSendProofBoundary({"),
    "Expected private-core send settlement to derive commitments from the send proof boundary.",
  );
  assert(
    runSource.includes("buildPrivateCoreSendCommittedSettlement({"),
    "Expected private-core send to build a committed-economics settlement packet.",
  );
  assert(
    settlementCall.includes('action: "send"'),
    "Expected the private-core send settlement call to preserve send action.",
  );
  assert(
    settlementCall.includes('economicsMode: "committed-economics"'),
    "Expected private-core send to use committed economics settlement mode.",
  );

  for (const rawField of ["amount:", "asset:", "destination:", "owner:"]) {
    assert(
      !settlementCall.includes(rawField),
      `Private-core send committed settlement must not pass raw ${rawField.slice(0, -1)}.`,
    );
  }

  for (const committedField of [
    "assetIdCommitment:",
    "changeLeafIndex:",
    "changeOutputCommitment:",
    "changeOutputRoot:",
    "economicsCommitment:",
    "inputCommitment:",
    "inputRoot:",
    "nullifierOrReplayCommitment:",
    "outputCommitment:",
    "outputLeafIndex:",
    "outputRoot:",
    "ownerCommitment:",
    "routeCommitment:",
    "sendContextTag:",
    "sendPublicInputHash:",
    "settlementCommitment:",
  ]) {
    assert(
      settlementCall.includes(committedField),
      `Expected private-core send committed settlement to include ${committedField.slice(0, -1)}.`,
    );
  }

  assert(
    packageJson.scripts?.["private-core:verify"]?.includes(
      "private-core:send-committed-settlement-check",
    ),
    "Expected private-core:verify to include private-core:send-committed-settlement-check.",
  );

  console.log("private-core send committed settlement bridge: PASS");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
