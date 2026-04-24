import { execFileSync, spawn } from "node:child_process";

const port = 5020 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const browserSession = `vanta-mobile-check-${process.pid}-${Date.now()}`;

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForVite() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/app/shield`);
      if (response.ok) {
        return;
      }
    } catch {
      // Vite is still booting.
    }

    await sleep(250);
  }

  throw new Error("Vanta dev server did not become ready for mobile browser verification.");
}

function runBrowserCommand(args, options = {}) {
  const output = execFileSync("gsd-browser", ["--session", browserSession, ...args], {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });

  return typeof output === "string" ? output.trim() : "";
}

function runBrowserBatch(steps) {
  execFileSync(
    "gsd-browser",
    ["--session", browserSession, "batch", "--steps", JSON.stringify(steps), "--summary-only"],
    { stdio: "pipe" },
  );
}

const forbiddenFundingChecks = [
  { kind: "text_hidden", text: "Funding" },
  { kind: "text_hidden", text: "Top up with Peer" },
  { kind: "text_hidden", text: "No wallet funds detected" },
  { kind: "text_hidden", text: "Connect, create a fresh wallet, or top up with Peer on desktop." },
];

function runMobileRouteProbe(path) {
  runBrowserBatch([
    { action: "navigate", url: `${baseUrl}${path}` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: path },
        { kind: "text_visible", text: "Vanta" },
        {
          kind: "selector_visible",
          selector: ".button-primary, .strategy-primary-action, .app-header__account-trigger",
        },
        { kind: "no_console_errors" },
      ],
    },
  ]);

  const probe = `(async () => {
    const documentElement = document.documentElement;
    const body = document.body;
    const interactive = [...document.querySelectorAll("button, a, input, select, textarea")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      });
    const tooSmall = interactive
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 40 || rect.height < 40;
      })
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        text: String(element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 40),
        width: Math.round(element.getBoundingClientRect().width),
        height: Math.round(element.getBoundingClientRect().height),
      }));
    return {
      path: location.pathname,
      viewportWidth: window.innerWidth,
      documentWidth: Math.max(documentElement.scrollWidth, body.scrollWidth),
      horizontalOverflow: Math.max(documentElement.scrollWidth, body.scrollWidth) - window.innerWidth,
      tooSmall,
    };
  })()`;
  const result = JSON.parse(runBrowserCommand(["eval", probe]));

  if (result.horizontalOverflow > 2) {
    throw new Error(
      `Mobile overflow on ${path}: viewport=${result.viewportWidth}, document=${result.documentWidth}, overflow=${result.horizontalOverflow}`,
    );
  }

  if (result.tooSmall.length > 0) {
    throw new Error(`Small mobile hit targets on ${path}: ${JSON.stringify(result.tooSmall.slice(0, 8))}`);
  }
}

function runTabletHeaderProbe() {
  runBrowserCommand(["set-viewport", "--width", "860", "--height", "900"], { stdio: "ignore" });
  runBrowserBatch([
    { action: "navigate", url: `${baseUrl}/app/shield` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/shield" },
        { kind: "text_visible", text: "Docs" },
        { kind: "text_visible", text: "Pay" },
        { kind: "no_console_errors" },
      ],
    },
  ]);

  const overlapProbe = `(async () => {
    const tabsRail = document.querySelector(".app-header__tabs-rail");
    const wallet = document.querySelector(".app-header__wallet");
    if (!(tabsRail instanceof HTMLElement) || !(wallet instanceof HTMLElement)) {
      return { missing: true };
    }

    const tabsRect = tabsRail.getBoundingClientRect();
    const walletRect = wallet.getBoundingClientRect();
    const horizontalOverlap = Math.max(
      0,
      Math.min(tabsRect.right, walletRect.right) - Math.max(tabsRect.left, walletRect.left),
    );
    const verticalOverlap = Math.max(
      0,
      Math.min(tabsRect.bottom, walletRect.bottom) - Math.max(tabsRect.top, walletRect.top),
    );

    return {
      missing: false,
      horizontalOverlap: Math.round(horizontalOverlap),
      verticalOverlap: Math.round(verticalOverlap),
      tabsTop: Math.round(tabsRect.top),
      walletTop: Math.round(walletRect.top),
    };
  })()`;
  const result = JSON.parse(runBrowserCommand(["eval", overlapProbe]));

  if (result.missing) {
    throw new Error("Tablet header probe could not find the app tabs rail or wallet cluster.");
  }

  if (result.horizontalOverlap > 0 && result.verticalOverlap > 0) {
    throw new Error(
      `Tablet header layout overlap: tabs and wallet cluster intersect by ${result.horizontalOverlap}x${result.verticalOverlap}px.`,
    );
  }
}

function runWalletMenuProbe() {
  runBrowserBatch([
    { action: "navigate", url: `${baseUrl}/app/shield` },
    { action: "wait_for", condition: "network_idle" },
    { action: "wait_for", condition: "text_visible", value: "Vanta" },
    { action: "click", selector: ".app-header__account-trigger" },
    { action: "wait_for", condition: "text_visible", value: "Wallet" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Wallet" },
        { kind: "text_visible", text: "Detected wallets" },
        { kind: "text_visible", text: "Create fresh wallet" },
        ...forbiddenFundingChecks,
        { kind: "no_console_errors" },
      ],
    },
  ]);
}

const vite = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  env: {
    ...process.env,
    VITE_VANTA_DEPLOYMENT_MODE: "beta",
    VITE_VANTA_ENABLE_PEER_ONRAMP: "true",
    VITE_VANTA_ENABLE_LIVE_PEER_FUNDING: "true",
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
  await waitForVite();
  runTabletHeaderProbe();
  runBrowserCommand(["emulate-device", "iPhone 15"], { stdio: "ignore" });

  for (const path of ["/app/shield", "/app/send", "/app/swap", "/app/strategy", "/app/unshield", "/app/pay"]) {
    runMobileRouteProbe(path);
  }
  runWalletMenuProbe();

  console.log("vanta mobile browser check: PASS");
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
    execFileSync("gsd-browser", ["--session", browserSession, "daemon", "stop"], { stdio: "ignore" });
  } catch {
    // The daemon may already be stopped.
  }
}
