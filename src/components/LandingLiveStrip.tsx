import { useEffect, useMemo, useState } from "react";
import { mainnetBrowserRpcEndpoint } from "@/solana/browserRpcEndpoint";

const POLL_INTERVAL_MS = 2000;
const REQUEST_TIMEOUT_MS = 1800;

type SolanaLivenessState = {
  blockHeight: number | null;
  latencyMs: number | null;
  pulseKey: number;
  status: "checking" | "online" | "unavailable";
};

function formatBlockHeight(blockHeight: number | null) {
  return typeof blockHeight === "number" ? blockHeight.toLocaleString("en-US") : "Checking";
}

function formatLatency(latencyMs: number | null) {
  return typeof latencyMs === "number" ? `${latencyMs}ms` : "Pending";
}

export function LandingLiveStrip() {
  const [liveness, setLiveness] = useState<SolanaLivenessState>({
    blockHeight: null,
    latencyMs: null,
    pulseKey: 0,
    status: "checking",
  });

  useEffect(() => {
    let mounted = true;
    let lastBlockHeight: number | null = null;
    let activeController: AbortController | null = null;

    async function getBlockHeight() {
      activeController?.abort();
      const controller = new AbortController();
      let didTimeout = false;
      const timeoutId = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);
      activeController = controller;
      const startedAt = performance.now();

      try {
        const response = await fetch(mainnetBrowserRpcEndpoint, {
          body: JSON.stringify({
            id: "vanta-landing-live-strip",
            jsonrpc: "2.0",
            method: "getBlockHeight",
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Solana RPC responded with ${response.status}`);
        }

        const payload = (await response.json()) as { result?: unknown };
        if (typeof payload.result !== "number") {
          throw new Error("Solana RPC getBlockHeight response did not include a numeric result.");
        }

        const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
        const blockHeight = payload.result;
        const didAdvance = lastBlockHeight !== null && blockHeight > lastBlockHeight;
        lastBlockHeight = blockHeight;

        if (mounted) {
          setLiveness((current) => ({
            blockHeight,
            latencyMs,
            pulseKey: didAdvance ? current.pulseKey + 1 : current.pulseKey,
            status: "online",
          }));
        }
      } catch (error) {
        if (controller.signal.aborted && !didTimeout) {
          return;
        }

        if (mounted) {
          setLiveness((current) => ({
            blockHeight: current.blockHeight,
            latencyMs: null,
            pulseKey: current.pulseKey,
            status: "unavailable",
          }));
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    void getBlockHeight();
    const intervalId = window.setInterval(() => {
      void getBlockHeight();
    }, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      activeController?.abort();
    };
  }, []);

  const statusLabel = useMemo(() => {
    if (liveness.status === "online") {
      return "RPC online";
    }

    if (liveness.status === "unavailable") {
      return "RPC unavailable";
    }

    return "Checking RPC";
  }, [liveness.status]);

  return (
    <section
      className="landing-minimal__live-strip"
      aria-label="Solana mainnet liveness"
      data-vanta-landing-live-strip
    >
      <div className="landing-minimal__live-heading">
        <span
          key={liveness.pulseKey}
          className={`landing-minimal__live-dot landing-minimal__live-dot--${liveness.status}`}
          aria-hidden="true"
          data-vanta-landing-slot-pulse
        />
        <div>
          <span>Solana mainnet</span>
          <strong data-vanta-solana-status>{statusLabel}</strong>
        </div>
      </div>

      <dl className="landing-minimal__live-metrics">
        <div>
          <dt>Block height</dt>
          <dd data-vanta-solana-block-height>{formatBlockHeight(liveness.blockHeight)}</dd>
        </div>
        <div>
          <dt>Latency</dt>
          <dd data-vanta-solana-latency>{formatLatency(liveness.latencyMs)}</dd>
        </div>
      </dl>

      <p>
        <strong>Beta truth:</strong> Network liveness only; not private-settlement readiness.
      </p>
    </section>
  );
}
