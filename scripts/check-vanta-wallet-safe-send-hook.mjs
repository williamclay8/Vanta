import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";

const repoRoot = resolve(import.meta.dirname, "..");
const hookPath = resolve(repoRoot, "src/wallet/useVantaSafeSendTransaction.ts");

assert.ok(existsSync(hookPath), "Missing src/wallet/useVantaSafeSendTransaction.ts.");

const source = readFileSync(hookPath, "utf8");

for (const phrase of [
  "useVantaSafeSendTransaction",
  "createWalletSafeSendBoundary",
  "prepareWalletSafeSendBoundary",
  "runWalletSafeSendBoundary",
  "sendPreparedWalletSafeSendBoundary",
  "useSolanaClient",
  "useWalletSession",
  "client.transaction.prepare",
  "client.transaction.toWire",
  "client.runtime.rpc.simulateTransaction",
  "client.transaction.send",
  "status: \"blocked\"",
  "status: \"prepared\"",
  "preflight",
  "sendPrepared",
  "safeStatus",
  "status === \"submitted\"",
  "simulationResult",
  "createBlockedSafeSendError",
  "Transaction simulation failed before wallet approval",
]) {
  assert.ok(source.includes(phrase), `Safe send hook missing required phrase: ${phrase}`);
}

assert.ok(
  !source.includes("prepareAndSend("),
  "Safe send hook must not bypass the safe boundary with prepareAndSend.",
);

console.log("Vanta wallet safe send hook check: PASS");
