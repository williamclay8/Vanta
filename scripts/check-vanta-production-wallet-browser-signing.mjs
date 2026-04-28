import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.VANTA_PUBLIC_APP_URL?.trim() || "https://vantaprivacy.xyz";
const routes = [
  { page: "Shield", path: "/app/shield", routeText: "SHIELD" },
  { page: "Send", path: "/app/send", routeText: "SEND SHIELDED" },
  { page: "Swap", path: "/app/swap", routeText: "TRADE SHIELDED" },
  { page: "Unshield", path: "/app/unshield", routeText: "UNSHIELD" },
];

function stopBrowserDaemon() {
  try {
    execFileSync("gsd-browser", ["daemon", "stop"], { stdio: "ignore" });
  } catch {
    // The daemon may already be stopped.
  }

  rmSync(join(tmpdir(), "chromiumoxide-runner"), {
    force: true,
    maxRetries: 3,
    recursive: true,
    retryDelay: 100,
  });
}

function routeAssertSteps(route) {
  return [
    { action: "navigate", url: `${baseUrl}${route.path}` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: route.path },
        { kind: "text_visible", text: route.routeText },
        { kind: "text_visible", text: "CONNECT" },
        { kind: "text_visible", text: "FRESH WALLET" },
        { kind: "text_hidden", text: "Vanta Beta" },
        { kind: "text_hidden", text: "VANTA BETA" },
        {
          kind: "text_hidden",
          text: "No funds move in this mode. Live private settlement is offline until production services are resumed.",
        },
        { kind: "text_hidden", text: "BETA MODE" },
        { kind: "text_hidden", text: "Awaiting wallet confirmation" },
        { kind: "text_hidden", text: "mainnet-beta" },
        { kind: "text_hidden", text: "private key" },
        { kind: "text_hidden", text: "seed phrase" },
        { kind: "no_console_errors" },
      ],
    },
  ];
}

const steps = routes.flatMap(routeAssertSteps);

try {
  stopBrowserDaemon();
  execFileSync("gsd-browser", ["batch", "--steps", JSON.stringify(steps), "--summary-only"], {
    stdio: "pipe",
  });

  console.log("Vanta production wallet browser signing check: PASS");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  stopBrowserDaemon();
}
