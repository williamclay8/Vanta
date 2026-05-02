import { liveSwapPair } from "@/solana/shieldConfig";

export type SolUnshieldOperatorHealth = {
  endpoint: string;
  kind: "vanta-sol-unshield-operator-health";
  note: string;
  ready: boolean;
  releaseModel: "operator-signed-mainnet-sol-transfer";
  signerAddress: string | null;
  status: "ready" | "blocked";
  version: "vanta-sol-unshield-operator-health-0.1";
};

export async function fetchSolUnshieldOperatorHealth(): Promise<SolUnshieldOperatorHealth> {
  const operatorUrl = liveSwapPair.solUnshieldOperatorUrl.replace(/\/+$/, "");
  const healthUrl = new URL(
    "../../health/sol-unshield",
    `${operatorUrl}/`,
  ).toString();
  const response = await fetch(healthUrl, {
    method: "GET",
    signal: AbortSignal.timeout(5_000),
  });
  const responseText = await response.text();
  let parsed: Partial<SolUnshieldOperatorHealth>;
  try {
    parsed = JSON.parse(responseText || "{}") as Partial<SolUnshieldOperatorHealth>;
  } catch {
    throw new Error("The SOL unshield operator health payload was invalid.");
  }

  if (
    parsed.kind !== "vanta-sol-unshield-operator-health" ||
    parsed.version !== "vanta-sol-unshield-operator-health-0.1" ||
    parsed.endpoint !== "/unshield/sol" ||
    (parsed.status !== "ready" && parsed.status !== "blocked") ||
    typeof parsed.ready !== "boolean"
  ) {
    throw new Error("The SOL unshield operator health payload was invalid.");
  }

  if (!response.ok || parsed.ready !== true) {
    throw new Error(parsed.note ?? "The SOL unshield operator is not ready.");
  }

  return parsed as SolUnshieldOperatorHealth;
}
