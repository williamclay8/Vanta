import { execFileSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const port = 5020 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const browserSession = `vanta-mobile-check-${process.pid}-${Date.now()}`;

function clearStaleBrowserProfileLock() {
  try {
    rmSync(join(tmpdir(), "chromiumoxide-runner"), { recursive: true, force: true });
  } catch {
    // Chrome may still be releasing the profile lock; the next gsd-browser launch can retry.
  }
}

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
  let output;

  try {
    output = execFileSync("gsd-browser", ["--session", browserSession, ...args], {
      encoding: "utf8",
      stdio: options.stdio ?? "pipe",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("daemon exited during startup") && !message.includes("daemon connection failed")) {
      throw error;
    }

    clearStaleBrowserProfileLock();
    output = execFileSync("gsd-browser", ["--session", browserSession, ...args], {
      encoding: "utf8",
      stdio: options.stdio ?? "pipe",
    });
  }

  return typeof output === "string" ? output.trim() : "";
}

function runBrowserBatch(steps) {
  try {
    execFileSync(
      "gsd-browser",
      ["--session", browserSession, "batch", "--steps", JSON.stringify(steps), "--summary-only"],
      { stdio: "pipe" },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("daemon exited during startup") && !message.includes("daemon connection failed")) {
      throw error;
    }

    clearStaleBrowserProfileLock();
    execFileSync(
      "gsd-browser",
      ["--session", browserSession, "batch", "--steps", JSON.stringify(steps), "--summary-only"],
      { stdio: "pipe" },
    );
  }
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
        { kind: "selector_visible", selector: ".app-header__brand" },
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
  for (const width of [1040, 860]) {
    runBrowserCommand(["set-viewport", "--width", String(width), "--height", "900"], { stdio: "ignore" });
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
        tabsHeight: Math.round(tabsRect.height),
        tabsClientWidth: Math.round(tabsRail.clientWidth),
        tabsScrollWidth: Math.round(tabsRail.scrollWidth),
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
        `Tablet header layout overlap at ${width}px: tabs and wallet cluster intersect by ${result.horizontalOverlap}x${result.verticalOverlap}px.`,
      );
    }

    if (result.tabsHeight > 48 || result.tabsScrollWidth > result.tabsClientWidth + 2) {
      throw new Error(`Tablet tab rail does not fit cleanly at ${width}px: ${JSON.stringify(result)}`);
    }
  }
}

function runPrimaryTabTapNavigationProbe() {
  for (const width of [375, 390]) {
    runBrowserCommand(["set-viewport", "--width", String(width), "--height", "900"], { stdio: "ignore" });
    runBrowserBatch([
      { action: "navigate", url: `${baseUrl}/app/send` },
      { action: "wait_for", condition: "network_idle" },
    ]);

    runBrowserCommand([
      "eval",
      `(() => {
        const record = () => {
          const main = document.querySelector("main");
          const bodyText = document.body.textContent?.trim() ?? "";
          window.__vantaMobileTabProbe.shellDropped ||= !document.querySelector("[data-product-shell='app']");
          window.__vantaMobileTabProbe.loadingFallback ||= bodyText === "Loading..." || bodyText === "Loading…";
          window.__vantaMobileTabProbe.blankMain ||= main instanceof HTMLElement && main.getBoundingClientRect().height < 80;
        };

        window.__vantaMobileTabProbe = {
          shellDropped: false,
          loadingFallback: false,
          blankMain: false,
        };
        window.__vantaMobileTabObserver?.disconnect?.();
        window.__vantaMobileTabObserver = new MutationObserver(record);
        window.__vantaMobileTabObserver.observe(document.body, { childList: true, subtree: true });
        record();
        return true;
      })()`,
    ]);

    runBrowserBatch([
      { action: "click", selector: "a[href='/app/swap']" },
      { action: "wait_for", condition: "network_idle" },
      {
        action: "assert",
        checks: [
          { kind: "url_contains", text: "/app/swap" },
          { kind: "selector_visible", selector: ".app-header__tabs[data-product-nav]" },
          { kind: "no_console_errors" },
        ],
      },
    ]);

    const continuityProbe = JSON.parse(
      runBrowserCommand([
        "eval",
        `(() => {
          window.__vantaMobileTabObserver?.disconnect?.();
          const main = document.querySelector("main");
          return {
            ...window.__vantaMobileTabProbe,
            path: location.pathname,
            mainHeight: main instanceof HTMLElement ? Math.round(main.getBoundingClientRect().height) : 0,
            mainText: main?.textContent?.trim().slice(0, 80) ?? "",
            shellPresent: Boolean(document.querySelector("[data-product-shell='app']")),
          };
        })()`,
      ]),
    );

    if (
      continuityProbe.shellDropped ||
      continuityProbe.loadingFallback ||
      continuityProbe.blankMain ||
      !continuityProbe.shellPresent ||
      continuityProbe.mainHeight < 120
    ) {
      throw new Error(`Mobile tab navigation dropped or blanked the app shell: ${JSON.stringify(continuityProbe)}`);
    }

    runBrowserCommand([
      "eval",
      `(() => {
        window.scrollTo(0, 220);
        document.querySelector("a[href='/app/shield']")?.click();
        return true;
      })()`,
    ]);
    runBrowserCommand(["wait-for", "--condition", "url_contains", "--value", "/app/shield"]);
    runBrowserCommand(["wait-for", "--condition", "network_idle"]);

    const tabTapProbe = `(() => {
      const documentElement = document.documentElement;
      const body = document.body;
      const header = document.querySelector(".app-header");
      const tabs = document.querySelector(".app-header__tabs");
      const activeTab = document.querySelector(".app-header__tab--active");
      if (!(header instanceof HTMLElement) || !(tabs instanceof HTMLElement) || !(activeTab instanceof HTMLElement)) {
        return { missing: true };
      }

      const headerRect = header.getBoundingClientRect();
      const tabsRect = tabs.getBoundingClientRect();
      const activeRect = activeTab.getBoundingClientRect();

      return {
        missing: false,
        width: window.innerWidth,
        path: location.pathname,
        scrollY: Math.round(window.scrollY),
        headerHeight: Math.round(headerRect.height),
        headerTop: Math.round(headerRect.top),
        tabsHeight: Math.round(tabsRect.height),
        activeTabLeft: Math.round(activeRect.left),
        activeTabRight: Math.round(activeRect.right),
        horizontalOverflow:
          Math.max(documentElement.scrollWidth, body.scrollWidth) - window.innerWidth,
      };
    })()`;
    const result = JSON.parse(runBrowserCommand(["eval", tabTapProbe]));

    if (result.missing) {
      throw new Error("Mobile tab tap probe could not find the app header, tabs, or active tab.");
    }

    if (result.headerHeight > 180 || result.tabsHeight > 80 || result.horizontalOverflow > 2) {
      throw new Error(
        `Mobile tab tap layout broke at ${width}px: ${JSON.stringify(result)}`,
      );
    }

    if (result.scrollY > 2 || result.headerTop < 0) {
      throw new Error(`Mobile tab route did not reset to the visible page top at ${width}px: ${JSON.stringify(result)}`);
    }

    if (result.activeTabLeft < 0 || result.activeTabRight > result.width) {
      throw new Error(`Mobile active tab is not visible after tap at ${width}px: ${JSON.stringify(result)}`);
    }
  }
}

function runWalletMenuProbe() {
  runBrowserBatch([
    { action: "navigate", url: `${baseUrl}/app/shield` },
    { action: "wait_for", condition: "network_idle" },
    { action: "wait_for", condition: "selector_visible", value: ".app-header__brand" },
    { action: "click", selector: ".app-header__account-trigger" },
    { action: "wait_for", condition: "selector_visible", value: ".wallet-picker" },
    {
      action: "assert",
      checks: [
        { kind: "selector_visible", selector: ".wallet-picker" },
        { kind: "text_visible", text: "Detected wallets" },
        { kind: "text_visible", text: "Create fresh wallet" },
        ...forbiddenFundingChecks,
        { kind: "no_console_errors" },
      ],
    },
  ]);
}

function runMobileSafariWalletPromptProbe() {
  runBrowserCommand(["set-viewport", "--width", "390", "--height", "844"], { stdio: "ignore" });
  runBrowserBatch([
    { action: "navigate", url: `${baseUrl}/app/send?mobile-wallet-prompt=1` },
    { action: "wait_for", condition: "network_idle" },
    { action: "wait_for", condition: "selector_visible", value: ".app-header__brand" },
    { action: "click", selector: ".app-header__account-trigger" },
    { action: "wait_for", condition: "selector_visible", value: ".wallet-picker__mobile-wallet-prompt" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Open Vanta in your wallet" },
        { kind: "text_visible", text: "Safari cannot connect Phantom directly." },
        { kind: "selector_visible", selector: "a[data-wallet-open='phantom']" },
        { kind: "selector_visible", selector: "a[data-wallet-open='solflare']" },
        { kind: "no_console_errors" },
      ],
    },
  ]);

  const linkProbe = `(() => {
    const phantom = document.querySelector("a[data-wallet-open='phantom']");
    const solflare = document.querySelector("a[data-wallet-open='solflare']");
    return {
      phantomHref: phantom?.href ?? null,
      solflareHref: solflare?.href ?? null,
      currentUrl: location.href,
      ref: location.origin,
    };
  })()`;
  const result = JSON.parse(runBrowserCommand(["eval", linkProbe]));
  const encodedUrl = encodeURIComponent(result.currentUrl);
  const encodedRef = encodeURIComponent(result.ref);

  if (result.phantomHref !== `https://phantom.app/ul/browse/${encodedUrl}?ref=${encodedRef}`) {
    throw new Error(`Unexpected Phantom mobile wallet link: ${result.phantomHref}`);
  }

  if (result.solflareHref !== `https://solflare.com/ul/v1/browse/${encodedUrl}?ref=${encodedRef}`) {
    throw new Error(`Unexpected Solflare mobile wallet link: ${result.solflareHref}`);
  }
}

function runLandingMobileSafariWalletPromptProbe() {
  runBrowserCommand(["set-viewport", "--width", "390", "--height", "844"], { stdio: "ignore" });
  runBrowserBatch([
    { action: "navigate", url: `${baseUrl}/?mobile-wallet-prompt=1` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "text_hidden", text: "Open Vanta in your wallet" },
        { kind: "no_console_errors" },
      ],
    },
  ]);

  const promptProbe = `(() => {
    const prompt = document.querySelector(".mobile-wallet-open-prompt, .wallet-picker__mobile-wallet-prompt");
    return {
      path: location.pathname,
      search: location.search,
      hasPrompt: prompt instanceof HTMLElement,
    };
  })()`;
  const result = JSON.parse(runBrowserCommand(["eval", promptProbe]));

  if (
    result.path !== "/" ||
    result.search !== "?mobile-wallet-prompt=1" ||
    result.hasPrompt
  ) {
    throw new Error(`Landing page should not render the wallet-open prompt outside the app wallet box: ${JSON.stringify(result)}`);
  }
}

function runDesktopSafariWalletPromptProbe() {
  runBrowserCommand(["set-viewport", "--width", "1280", "--height", "900"], { stdio: "ignore" });
  runBrowserBatch([
    { action: "navigate", url: `${baseUrl}/app/send?mobile-wallet-prompt=1` },
    { action: "wait_for", condition: "network_idle" },
    { action: "wait_for", condition: "selector_visible", value: ".app-header__brand" },
    { action: "click", selector: ".app-header__account-trigger" },
    { action: "wait_for", condition: "selector_visible", value: ".wallet-picker__mobile-wallet-prompt" },
    {
      action: "assert",
      checks: [
        { kind: "text_visible", text: "Open Vanta in your wallet" },
        { kind: "text_visible", text: "Safari cannot connect Phantom directly." },
        { kind: "selector_visible", selector: "a[data-wallet-open='phantom']" },
        { kind: "selector_visible", selector: "a[data-wallet-open='solflare']" },
        { kind: "no_console_errors" },
      ],
    },
  ]);

  const promptProbe = `(() => {
    const prompt = document.querySelector(".wallet-picker__mobile-wallet-prompt");
    const rect = prompt?.getBoundingClientRect();
    const wallet = document.querySelector(".app-header__wallet");
    const walletRect = wallet?.getBoundingClientRect();
    return {
      hasPrompt: prompt instanceof HTMLElement,
      promptText: prompt?.textContent ?? "",
      left: rect ? Math.round(rect.left) : null,
      right: rect ? Math.round(rect.right) : null,
      width: rect ? Math.round(rect.width) : null,
      walletRight: walletRect ? Math.round(walletRect.right) : null,
      viewportWidth: window.innerWidth,
    };
  })()`;
  const result = JSON.parse(runBrowserCommand(["eval", promptProbe]));

  if (
    !result.hasPrompt ||
    !result.promptText.includes("Open Vanta in your wallet") ||
    result.width > 520 ||
    result.right > result.viewportWidth ||
    Math.abs(result.right - result.walletRight) > 18
  ) {
    throw new Error(`Desktop Safari wallet prompt missing from the top-right wallet box or poorly framed: ${JSON.stringify(result)}`);
  }
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
  clearStaleBrowserProfileLock();
  await waitForVite();
  runTabletHeaderProbe();
  runPrimaryTabTapNavigationProbe();
  runBrowserCommand(["emulate-device", "iPhone 15"], { stdio: "ignore" });

  for (const path of ["/app/shield", "/app/send", "/app/swap", "/app/strategy", "/app/unshield", "/app/pay"]) {
    runMobileRouteProbe(path);
  }
  runWalletMenuProbe();
  runMobileSafariWalletPromptProbe();
  runLandingMobileSafariWalletPromptProbe();
  runDesktopSafariWalletPromptProbe();

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
