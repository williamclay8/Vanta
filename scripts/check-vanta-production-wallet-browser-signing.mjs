import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";

const session = `vanta-prod-wallet-${Date.now()}`;
const baseUrl = process.env.VANTA_PUBLIC_APP_URL?.trim() || "https://vantaprivacy.xyz";
const routes = [
  { page: "Shield", path: "/app/shield", routeText: "SHIELD" },
  { page: "Send", path: "/app/send", routeText: "PRIVATE SEND" },
  { page: "Swap", path: "/app/swap", routeText: "PRIVATE SWAP" },
  { page: "Unshield", path: "/app/unshield", routeText: "UNSHIELD" },
];

function runBrowserCommand(args, options = {}) {
  const output = execFileSync("gsd-browser", ["--session", session, ...args], {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });

  return typeof output === "string" ? output.trim() : "";
}

function probeRoute(route) {
  runBrowserCommand(["navigate", `${baseUrl}${route.path}`], { stdio: "ignore" });
  runBrowserCommand(["wait-for", "--condition", "network_idle"], { stdio: "ignore" });
  runBrowserCommand(
    [
      "assert",
      "--checks",
      JSON.stringify([
        { kind: "url_contains", text: route.path },
        { kind: "text_visible", text: route.routeText },
        { kind: "text_hidden", text: "VANTA BETA" },
        { kind: "text_hidden", text: "No funds move in this mode. Live private settlement is offline until production services are resumed." },
        { kind: "no_console_errors" },
        { kind: "no_failed_requests" },
      ]),
    ],
    { stdio: "ignore" },
  );

  const probe = `(async () => {
    const body = document.body.innerText;
    return {
      path: location.pathname,
      betaBannerVisible: body.includes("VANTA BETA"),
      settlementOfflineVisible: body.includes("No funds move in this mode. Live private settlement is offline until production services are resumed."),
      betaModeVisible: body.includes("BETA MODE"),
      awaitingWalletVisible: body.includes("Awaiting wallet confirmation"),
      mainnetBetaVisible: body.includes("mainnet-beta"),
      privateKeyVisible: body.includes("private key"),
      seedPhraseVisible: body.includes("seed phrase"),
      connectVisible: body.includes("CONNECT"),
      freshWalletVisible: body.includes("FRESH WALLET"),
    };
  })()`;

  const result = JSON.parse(runBrowserCommand(["eval", probe]));

  assert.equal(result.path, route.path, `Unexpected path for ${route.page}.`);
  assert.equal(result.betaBannerVisible, false, `${route.page} must not show the live beta-mode banner.`);
  assert.equal(result.settlementOfflineVisible, false, `${route.page} must not show the settlement-offline banner.`);
  assert.equal(result.betaModeVisible, false, `${route.page} must not show the beta-mode footer label.`);
  assert.equal(result.awaitingWalletVisible, false, `${route.page} must not expose an awaiting-wallet state by default.`);
  assert.equal(result.mainnetBetaVisible, false, `${route.page} must not expose raw mainnet-beta cluster copy.`);
  assert.equal(result.privateKeyVisible, false, `${route.page} must not expose private-key copy.`);
  assert.equal(result.seedPhraseVisible, false, `${route.page} must not expose seed-phrase copy.`);
  assert.equal(result.connectVisible, true, `${route.page} must keep the connect wallet trigger visible.`);
  assert.equal(result.freshWalletVisible, true, `${route.page} must keep the fresh wallet path visible.`);
}

try {
  for (const route of routes) {
    probeRoute(route);
  }

  console.log("Vanta production wallet browser signing check: PASS");
} finally {
  try {
    execFileSync("gsd-browser", ["daemon", "stop"], { stdio: "ignore" });
  } catch {
    // The daemon may already be stopped.
  }
}
