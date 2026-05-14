import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
const port = 5260 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const browserSession = `vanta-landing-check-${process.pid}-${Date.now()}`;
const liveStripSourcePath = path.join(process.cwd(), "src", "components", "LandingLiveStrip.tsx");

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForVite() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Vite is still booting.
    }

    await sleep(250);
  }

  throw new Error("Vanta dev server did not become ready for landing browser verification.");
}

function cleanupBrowserLock() {
  try {
    execFileSync("pkill", ["-f", "Google Chrome for Testing"], {
      stdio: "ignore",
    });
  } catch {
    // Chrome may already be stopped.
  }

  try {
    rmSync(path.join(os.tmpdir(), "chromiumoxide-runner"), {
      force: true,
      recursive: true,
    });
  } catch {
    // The temp runner directory may already be gone.
  }

  try {
    execFileSync("gsd-browser", ["daemon", "stop"], { stdio: "ignore" });
  } catch {
    // The daemon may already be stopped.
  }
}

function runBrowserCommand(args, options = {}) {
  const commandArgs = ["--session", browserSession, ...args];

  try {
    const output = execFileSync("gsd-browser", commandArgs, {
      encoding: "utf8",
      stdio: options.stdio ?? "pipe",
    });

    return typeof output === "string" ? output.trim() : "";
  } catch (error) {
    if (!options.retrying) {
      cleanupBrowserLock();
      return runBrowserCommand(args, { ...options, retrying: true });
    }

    throw error;
  }
}

function checkLandingLiveStripSource() {
  if (!existsSync(liveStripSourcePath)) {
    throw new Error("Missing src/components/LandingLiveStrip.tsx for the landing Solana liveness strip.");
  }

  const source = readFileSync(liveStripSourcePath, "utf8");
  const requiredSnippets = [
    "getBlockHeight",
    "mainnetBrowserRpcEndpoint",
    "setInterval",
    "2000",
    "REQUEST_TIMEOUT_MS",
    "AbortController",
    "Network liveness only",
    "not private-settlement readiness",
    "data-vanta-landing-live-strip",
    "data-vanta-solana-block-height",
    "data-vanta-solana-latency",
    "data-vanta-landing-slot-pulse",
  ];

  for (const snippet of requiredSnippets) {
    if (!source.includes(snippet)) {
      throw new Error(`Landing live strip source missing required contract snippet: ${snippet}`);
    }
  }

  if (source.includes("https://api.mainnet-beta.solana.com")) {
    throw new Error("Landing live strip must not use the browser-blocked Solana public endpoint.");
  }

  const rpcResolverSource = readFileSync(path.join(process.cwd(), "src", "solana", "browserRpcEndpoint.ts"), "utf8");
  for (const snippet of [
    "VITE_SOLANA_BROWSER_RPC_URL",
    "VITE_SOLANA_RPC_URL",
    "VITE_SOLANA_READ_RPC_FALLBACK_URLS",
    "api.mainnet-beta.solana.com",
    "https://solana-rpc.publicnode.com",
  ]) {
    if (!rpcResolverSource.includes(snippet)) {
      throw new Error(`Landing live strip RPC resolver missing required contract snippet: ${snippet}`);
    }
  }

  const homeSource = readFileSync(path.join(process.cwd(), "src", "pages", "HomePage.tsx"), "utf8");
  if (!homeSource.includes("import { LandingLiveStrip }") || !homeSource.includes("<LandingLiveStrip />")) {
    throw new Error("Home page must import and render LandingLiveStrip.");
  }

  const stylesSource = readFileSync(path.join(process.cwd(), "src", "styles.css"), "utf8");
  for (const snippet of [
    ".landing-minimal__live-strip",
    ".landing-minimal__live-heading",
    ".landing-minimal__live-metrics",
    ".landing-minimal__live-dot",
    "@keyframes landing-live-dot-pulse",
    "@media (prefers-reduced-motion: reduce)",
  ]) {
    if (!stylesSource.includes(snippet)) {
      throw new Error(`Landing live strip styles missing required selector/snippet: ${snippet}`);
    }
  }

  const bannedClaimPatterns = [
    /\bfully private\b/iu,
    /\banonymous payments?\b/iu,
    /\buntraceable\b/iu,
    /\bproduction[- ]ready\b/iu,
    /\blive mainnet private settlement\b/iu,
  ];

  for (const pattern of bannedClaimPatterns) {
    if (pattern.test(source)) {
      throw new Error(`Landing live strip source includes banned privacy/readiness claim: ${pattern}`);
    }
  }
}

function checkLandingViewport(width, height) {
  runBrowserCommand(["set-viewport", "--width", String(width), "--height", String(height)], {
    stdio: "ignore",
  });
  runBrowserCommand(["navigate", baseUrl], { stdio: "ignore" });
  runBrowserCommand(["wait-for", "--condition", "network_idle"], { stdio: "ignore" });

  const result = JSON.parse(
    runBrowserCommand([
      "eval",
      `(async () => JSON.stringify({
        path: location.pathname,
        headline: document.querySelector("h1")?.innerText ?? "",
        hasAppCta: [...document.querySelectorAll("a")].some((link) => link.textContent?.trim() === "Enter App" && link.getAttribute("href") === "/app"),
        hasSharedBrandWordmark: document.querySelector(".landing-nav__wordmark")?.textContent?.trim() === "VANTA",
        hasSharedAtmosphere: Boolean(
          document.querySelector(".landing-minimal__grid") &&
            document.querySelector(".landing-minimal__glow--left") &&
            document.querySelector(".landing-minimal__glow--right"),
        ),
        hasDocsAndAppPrimaryPaths: ["/docs", "/app"].every((href) =>
          [...document.querySelectorAll("a")].some((link) => link.getAttribute("href") === href),
        ),
        hasPaymentsCopy: document.body.innerText.includes("payment requests") && document.body.innerText.includes("receipt-backed records"),
        hasShieldFirstHeading: document.body.innerText.includes("The actions Vanta can show honestly."),
        hasPublicDepthDisclosure: Boolean(document.querySelector(".landing-depth-disclosure")) &&
          document.body.innerText.toLowerCase().includes("anonymity readiness: blocked") &&
          document.body.innerText.includes("Current pool depth is below the privacy threshold.") &&
          document.body.innerText.includes("2") &&
          document.body.innerText.includes("1,024") &&
          document.body.innerText.toLowerCase().includes("evidence-recorded commitments") &&
          document.body.innerText.toLowerCase().includes("required minimum") &&
          document.body.innerText.includes("Vanta does not claim live anonymity or production-private mainnet settlement yet"),
        hasLiveSolanaStrip: (() => {
          const liveStrip = document.querySelector("[data-vanta-landing-live-strip]");
          const whatSection = document.querySelector("#what");
          const stripText = liveStrip?.textContent ?? "";

          return Boolean(liveStrip) &&
            liveStrip.classList.contains("landing-minimal__live-strip") &&
            Boolean(whatSection) &&
            Boolean(liveStrip.compareDocumentPosition(whatSection) & Node.DOCUMENT_POSITION_FOLLOWING) &&
            stripText.includes("Solana mainnet") &&
            stripText.includes("Block height") &&
            stripText.includes("Latency") &&
            stripText.includes("Beta truth") &&
            stripText.includes("Network liveness only") &&
            stripText.includes("not private-settlement readiness") &&
            Boolean(liveStrip.querySelector("[data-vanta-solana-status]")) &&
            Boolean(liveStrip.querySelector("[data-vanta-solana-block-height]")) &&
            Boolean(liveStrip.querySelector("[data-vanta-solana-latency]")) &&
            Boolean(liveStrip.querySelector("[data-vanta-landing-slot-pulse]"));
        })(),
        primaryActionHrefs: [...document.querySelectorAll(".landing-minimal__action-list--primary a")]
          .map((link) => link.getAttribute("href")),
        previewActionHrefs: [...document.querySelectorAll(".landing-minimal__preview-link")]
          .map((link) => link.getAttribute("href")),
        previewActionText: [...document.querySelectorAll(".landing-minimal__preview-link")]
          .map((link) => link.textContent ?? "")
          .join(" "),
        hasPrimaryWalletActions:
          ["shield", "send", "swap", "unshield"].every((path) =>
            [...document.querySelectorAll(".landing-minimal__action-list--primary a")].some(
              (link) => link.getAttribute("href") === "/app/" + path,
            ),
          ) &&
          !["strategy", "pay"].some((path) =>
            [...document.querySelectorAll(".landing-minimal__action-list--primary a")].some(
              (link) => link.getAttribute("href") === "/app/" + path,
            ),
          ),
        hasPreviewSurfaceActions:
          ["pay", "strategy"].every((path) =>
            [...document.querySelectorAll(".landing-minimal__preview-link")].some(
              (link) => link.getAttribute("href") === "/app/" + path,
            ),
          ) &&
          [...document.querySelectorAll(".landing-minimal__preview-link")]
            .map((link) => link.textContent ?? "")
            .join(" ")
            .includes("Pay preview") &&
          [...document.querySelectorAll(".landing-minimal__preview-link")]
            .map((link) => link.textContent ?? "")
            .join(" ")
            .includes("Strategy preview") &&
          [...document.querySelectorAll(".landing-minimal__preview-link")]
            .map((link) => link.textContent ?? "")
            .join(" ")
            .includes("local receipt-backed records") &&
          [...document.querySelectorAll(".landing-minimal__preview-link")]
            .map((link) => link.textContent ?? "")
            .join(" ")
            .includes("before live routing is enabled"),
        horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        smallTargets: [...document.querySelectorAll("a, button")]
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && (rect.width < 40 || rect.height < 40);
          })
          .map((element) => ({
            text: String(element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 40),
            width: Math.round(element.getBoundingClientRect().width),
            height: Math.round(element.getBoundingClientRect().height),
          })),
      }))()`,
    ]),
  );

  if (result.path !== "/") {
    throw new Error(`Landing route should stay at /, got ${result.path}.`);
  }

  if (!result.headline.includes("Make Solana settlement") || !result.headline.includes("less public")) {
    throw new Error(`Landing headline missing: ${result.headline}`);
  }

  if (!result.hasAppCta) {
    throw new Error("Landing page must include an Enter App CTA to /app.");
  }

  if (!result.hasSharedBrandWordmark) {
    throw new Error("Landing page must keep the VANTA wordmark in the primary nav.");
  }

  if (!result.hasSharedAtmosphere) {
    throw new Error("Landing page must keep the branded atmosphere grid and glow contract.");
  }

  if (!result.hasDocsAndAppPrimaryPaths) {
    throw new Error("Landing page must keep direct paths into docs and the app.");
  }

  if (!result.hasPaymentsCopy) {
    throw new Error("Landing page must include payment suite copy.");
  }

  if (!result.hasShieldFirstHeading) {
    throw new Error("Landing page must use the constrained-action app heading.");
  }

  if (!result.hasPublicDepthDisclosure) {
    throw new Error("Landing page must show the truthful public anonymity-depth disclosure.");
  }

  if (!result.hasLiveSolanaStrip) {
    throw new Error("Landing page must show the scoped Solana mainnet liveness strip with beta-truth copy.");
  }

  if (!result.hasPrimaryWalletActions) {
    throw new Error(
      `Landing page must keep Shield/Send/Swap/Unshield as primary wallet actions without Pay/Strategy: ${JSON.stringify(result.primaryActionHrefs)}`,
    );
  }

  if (!result.hasPreviewSurfaceActions) {
    throw new Error(
      `Landing page must keep Pay/Strategy as preview surfaces: ${JSON.stringify({
        hrefs: result.previewActionHrefs,
        text: result.previewActionText,
      })}`,
    );
  }

  if (result.horizontalOverflow > 2) {
    throw new Error(`Landing page overflow at ${width}x${height}: ${result.horizontalOverflow}`);
  }

  if (result.smallTargets.length > 0) {
    throw new Error(`Landing page has small targets at ${width}x${height}: ${JSON.stringify(result.smallTargets)}`);
  }
}

const vite = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  env: {
    ...process.env,
    VITE_VANTA_DEPLOYMENT_MODE: "beta",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let stdout = "";
let stderr = "";
vite.stdout.on("data", (chunk) => {
  stdout += chunk.toString("utf8");
});
vite.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

try {
  checkLandingLiveStripSource();
  await waitForVite();
  checkLandingViewport(1440, 1000);
  checkLandingViewport(390, 844);
  console.log("vanta landing browser check: PASS");
} catch (error) {
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (vite.exitCode === null) {
    await new Promise((resolvePromise) => {
      vite.once("close", resolvePromise);
      vite.kill("SIGTERM");
    });
  }

  try {
    execFileSync("gsd-browser", ["daemon", "stop"], { stdio: "ignore" });
  } catch {
    // The daemon may already be stopped.
  }
}
