import { execFileSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const port = 5630 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const browserSession = `vanta-product-ui-check-${process.pid}-${Date.now()}`;

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

  throw new Error("Vanta dev server did not become ready for product UI browser verification.");
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

function runBrowserBatch() {
  const steps = [
    { action: "navigate", url: baseUrl },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/" },
        { kind: "selector_visible", selector: ".landing-nav" },
        { kind: "selector_visible", selector: ".landing-minimal__grid" },
        { kind: "selector_visible", selector: 'a[href="/app/shield"]' },
        { kind: "text_visible", text: "Privacy rails for" },
        { kind: "text_visible", text: "Docs" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: ".landing-nav__cta" },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/shield" },
        { kind: "selector_visible", selector: ".app-header" },
        { kind: "selector_visible", selector: ".system-status-strip" },
        { kind: "text_visible", text: "Trust status" },
        { kind: "text_visible", text: "Shield: Claim locked" },
        { kind: "text_visible", text: "Send: Claim locked" },
        { kind: "text_visible", text: "Swap: Claim locked" },
        { kind: "text_visible", text: "Unshield: Claim locked" },
        { kind: "text_visible", text: "Strategy: Claim locked" },
        { kind: "text_visible", text: "Pay: Claim locked" },
        { kind: "text_visible", text: "Shield" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/shield" },
        { kind: "selector_visible", selector: ".app-header" },
        { kind: "selector_visible", selector: ".system-status-strip" },
        { kind: "text_visible", text: "Trust status" },
        { kind: "text_visible", text: "Shield: Claim locked" },
        { kind: "text_visible", text: "Send: Claim locked" },
        { kind: "text_visible", text: "Swap: Claim locked" },
        { kind: "text_visible", text: "Unshield: Claim locked" },
        { kind: "text_visible", text: "Strategy: Claim locked" },
        { kind: "text_visible", text: "Pay: Claim locked" },
        { kind: "text_visible", text: "Shield" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/docs` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "selector_visible", selector: ".docs-shell" },
        { kind: "selector_visible", selector: "[data-docs-header]" },
        { kind: "selector_visible", selector: ".docs-home__hero" },
        { kind: "text_visible", text: "Move, send, and pay with more privacy." },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/send` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "selector_visible", selector: ".app-header" },
        { kind: "selector_visible", selector: ".app-header__tabs[data-product-nav]" },
        { kind: "text_visible", text: "Send" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/dashboard` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/dashboard" },
        { kind: "selector_visible", selector: ".dashboard-trust-hero" },
        { kind: "selector_visible", selector: ".dashboard-trust-packet" },
        { kind: "selector_visible", selector: ".dashboard-verification-card" },
        { kind: "selector_visible", selector: ".dashboard-next-step-card" },
        { kind: "text_visible", text: "What Vanta can honestly prove right now" },
        { kind: "text_visible", text: "Latest Trust Packet" },
        { kind: "text_visible", text: "Reviewer Verification" },
        { kind: "text_visible", text: "Verified SOL shield state" },
        { kind: "text_visible", text: "Actionable notes" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'a[href="/app/shield"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/shield" },
        { kind: "selector_visible", selector: ".system-status-strip" },
        { kind: "text_visible", text: "Trust status" },
        { kind: "text_visible", text: "Shield: Claim locked" },
        { kind: "text_visible", text: "Send: Claim locked" },
        { kind: "text_visible", text: "Swap: Claim locked" },
        { kind: "text_visible", text: "Unshield: Claim locked" },
        { kind: "text_visible", text: "Strategy: Claim locked" },
        { kind: "text_visible", text: "Pay: Claim locked" },
        { kind: "text_visible", text: "Shield" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'a[href="/app/swap"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/swap" },
        { kind: "text_visible", text: "Swap" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'a[href="/app/strategy"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/strategy" },
        { kind: "selector_visible", selector: ".system-status-strip" },
        { kind: "text_visible", text: "Trust status" },
        { kind: "text_visible", text: "Shield: Claim locked" },
        { kind: "text_visible", text: "Send: Claim locked" },
        { kind: "text_visible", text: "Swap: Claim locked" },
        { kind: "text_visible", text: "Unshield: Claim locked" },
        { kind: "text_visible", text: "Strategy: Claim locked" },
        { kind: "text_visible", text: "Pay: Claim locked" },
        { kind: "text_visible", text: "Strategy" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'a[href="/app/unshield"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/unshield" },
        { kind: "text_visible", text: "Unshield" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'a[href="/app/pay"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/pay" },
        { kind: "selector_visible", selector: ".system-status-strip" },
        { kind: "text_visible", text: "Trust status" },
        { kind: "text_visible", text: "Shield: Claim locked" },
        { kind: "text_visible", text: "Send: Claim locked" },
        { kind: "text_visible", text: "Swap: Claim locked" },
        { kind: "text_visible", text: "Unshield: Claim locked" },
        { kind: "text_visible", text: "Strategy: Claim locked" },
        { kind: "text_visible", text: "Pay: Claim locked" },
        { kind: "text_visible", text: "Pay" },
        { kind: "no_console_errors" },
      ],
    },
  ];

  execFileSync("gsd-browser", ["--session", browserSession, "batch", "--steps", JSON.stringify(steps), "--summary-only"], {
    stdio: "pipe",
  });

}

function assertSendWorkspaceCardCentered() {
  execFileSync("gsd-browser", ["--session", browserSession, "set-viewport", "--width", "1440", "--height", "1000"], {
    stdio: "ignore",
  });
  execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}/app/send`], {
    stdio: "ignore",
  });
  execFileSync("gsd-browser", ["--session", browserSession, "wait-for", "--condition", "network_idle"], {
    stdio: "ignore",
  });

  const rawResult = execFileSync(
    "gsd-browser",
    [
      "--session",
      browserSession,
      "--json",
      "eval",
      `(() => {
        const intro = document.querySelector(".send-page > .product-intro");
        const heading = document.querySelector(".send-page > .product-intro h1, .send-page > .product-intro h2");
        const page = document.querySelector(".send-page");
        const card = document.querySelector(".send-page .send-card--workspace");

        if (
          !(intro instanceof HTMLElement) ||
          !(heading instanceof HTMLElement) ||
          !(page instanceof HTMLElement) ||
          !(card instanceof HTMLElement)
        ) {
          return { ok: false, reason: "send page, intro, heading, or workspace card missing" };
        }

        const introRect = intro.getBoundingClientRect();
        const headingRect = heading.getBoundingClientRect();
        const pageRect = page.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const introCenter = introRect.left + introRect.width / 2;
        const headingCenter = headingRect.left + headingRect.width / 2;
        const pageCenter = pageRect.left + pageRect.width / 2;
        const cardCenter = cardRect.left + cardRect.width / 2;
        const centerDelta = Math.abs(pageCenter - cardCenter);
        const headingCenterDelta = Math.abs(introCenter - headingCenter);

        return {
          ok: centerDelta <= 2 && headingCenterDelta <= 2,
          cardCenter,
          cardLeft: cardRect.left,
          cardWidth: cardRect.width,
          centerDelta,
          headingCenter,
          headingCenterDelta,
          headingLeft: headingRect.left,
          headingWidth: headingRect.width,
          introCenter,
          introLeft: introRect.left,
          introWidth: introRect.width,
          pageCenter,
          pageLeft: pageRect.left,
          pageWidth: pageRect.width,
        };
      })()`,
    ],
    { encoding: "utf8" },
  );

  const result = JSON.parse(rawResult);
  const rawValue = result.result ?? result.value ?? result;
  const value = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;

  if (!value.ok) {
    throw new Error(`Send workspace card is not centered: ${JSON.stringify(value)}`);
  }
}

function assertDesktopProductTabsFit() {
  for (const width of [1440, 1120, 1040, 980, 860, 768]) {
    execFileSync(
      "gsd-browser",
      ["--session", browserSession, "set-viewport", "--width", String(width), "--height", "900"],
      { stdio: "ignore" },
    );
    execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}/app/send`], {
      stdio: "ignore",
    });
    execFileSync("gsd-browser", ["--session", browserSession, "wait-for", "--condition", "network_idle"], {
      stdio: "ignore",
    });

    const rawResult = execFileSync(
      "gsd-browser",
      [
        "--session",
        browserSession,
        "--json",
        "eval",
        `(() => {
          const tabs = document.querySelector(".app-header__tabs");
          const documentElement = document.documentElement;
          const body = document.body;

          if (!(tabs instanceof HTMLElement)) {
            return { ok: false, reason: "product tabs missing", width: window.innerWidth };
          }

          const tabOverflow = tabs.scrollWidth - tabs.clientWidth;
          const documentOverflow = Math.max(documentElement.scrollWidth, body.scrollWidth) - window.innerWidth;

          return {
            ok: tabOverflow <= 2 && documentOverflow <= 2,
            documentOverflow,
            tabOverflow,
            tabsClientWidth: tabs.clientWidth,
            tabsScrollWidth: tabs.scrollWidth,
            width: window.innerWidth,
          };
        })()`,
      ],
      { encoding: "utf8" },
    );

    const result = JSON.parse(rawResult);
    const rawValue = result.result ?? result.value ?? result;
    const value = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;

    if (!value.ok) {
      throw new Error(`Desktop product tabs overflow at ${width}px: ${JSON.stringify(value)}`);
    }
  }
}

function assertActionTabsStayMinimal() {
  for (const route of ["/app/dashboard", "/app/shield", "/app/send", "/app/swap", "/app/strategy", "/app/unshield", "/app/pay"]) {
    execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}${route}`], {
      stdio: "ignore",
    });
    execFileSync("gsd-browser", ["--session", browserSession, "wait-for", "--condition", "network_idle"], {
      stdio: "ignore",
    });

    const rawResult = execFileSync(
      "gsd-browser",
      [
        "--session",
        browserSession,
        "--json",
        "eval",
        `(() => {
          const privateCorePanel = document.querySelector(".vanta-private-core-state-panel");
          const privateCoreVersionText = document.body.innerText.includes("Vanta Private Core v0.1");

          return {
            ok: privateCorePanel === null && !privateCoreVersionText,
            hasPrivateCorePanel: privateCorePanel !== null,
            hasPrivateCoreVersionText: privateCoreVersionText,
            route: window.location.pathname,
          };
        })()`,
      ],
      { encoding: "utf8" },
    );

    const result = JSON.parse(rawResult);
    const rawValue = result.result ?? result.value ?? result;
    const value = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;

    if (!value.ok) {
      throw new Error(`Action tab exposes private-core card chrome: ${JSON.stringify(value)}`);
    }
  }
}

function assertSystemStatusStripLayout() {
  for (const route of ["/app/shield", "/app/send", "/app/swap", "/app/unshield", "/app/strategy", "/app/pay"]) {
    for (const width of [1440, 768, 390, 360, 320]) {
      execFileSync(
        "gsd-browser",
        ["--session", browserSession, "set-viewport", "--width", String(width), "--height", "900"],
        { stdio: "ignore" },
      );
      execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}${route}`], {
        stdio: "ignore",
      });
      execFileSync("gsd-browser", ["--session", browserSession, "wait-for", "--condition", "network_idle"], {
        stdio: "ignore",
      });

      const rawResult = execFileSync(
        "gsd-browser",
        [
          "--session",
          browserSession,
          "--json",
          "eval",
          `(() => {
            const strip = document.querySelector(".system-status-strip");
            const header = document.querySelector(".app-header");
            const tabs = document.querySelector(".app-header__tabs");
            const bodyText = document.body.innerText;

            if (
              !(strip instanceof HTMLElement) ||
              !(header instanceof HTMLElement) ||
              !(tabs instanceof HTMLElement)
            ) {
              return {
                ok: false,
                reason: "system status strip, app header, or tabs missing",
                route: window.location.pathname,
                width: window.innerWidth,
              };
            }

            const stripRect = strip.getBoundingClientRect();
            const headerRect = header.getBoundingClientRect();
            const tabsRect = tabs.getBoundingClientRect();
            const documentOverflow =
              Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
              window.innerWidth;
            const stripOverflow = strip.scrollWidth - strip.clientWidth;
            const headerOverflow = header.scrollWidth - header.clientWidth;
            const stripBeforeHeader = stripRect.bottom <= headerRect.top + 2;
            const tabsReachable =
              tabsRect.width > 0 &&
              tabsRect.height > 0 &&
              tabsRect.top < window.innerHeight &&
              tabsRect.bottom > 0;
            const requiredStatusMarkers = [
              "Shield: Claim locked",
              "Send: Claim locked",
              "Swap: Claim locked",
              "Unshield: Claim locked",
              "Strategy: Claim locked",
              "Pay: Claim locked",
            ];
            const missingMarkers = requiredStatusMarkers.filter((marker) => !bodyText.includes(marker));

            return {
              ok:
                documentOverflow <= 2 &&
                stripOverflow <= 2 &&
                headerOverflow <= 2 &&
                stripBeforeHeader &&
                tabsReachable &&
                missingMarkers.length === 0,
              documentOverflow,
              headerOverflow,
              headerTop: headerRect.top,
              missingMarkers,
              route: window.location.pathname,
              stripBottom: stripRect.bottom,
              stripOverflow,
              tabsReachable,
              width: window.innerWidth,
            };
          })()`,
        ],
        { encoding: "utf8" },
      );

      const result = JSON.parse(rawResult);
      const rawValue = result.result ?? result.value ?? result;
      const value = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;

      if (!value.ok) {
        throw new Error(`System status strip layout failed: ${JSON.stringify(value)}`);
      }
    }
  }
}

function assertUnshieldAssetSelectorStaysCompact() {
  for (const width of [1440, 390]) {
    execFileSync(
      "gsd-browser",
      ["--session", browserSession, "set-viewport", "--width", String(width), "--height", "900"],
      { stdio: "ignore" },
    );
    execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}/app/unshield`], {
      stdio: "ignore",
    });
    execFileSync("gsd-browser", ["--session", browserSession, "wait-for", "--condition", "network_idle"], {
      stdio: "ignore",
    });

    const rawResult = execFileSync(
      "gsd-browser",
      [
        "--session",
        browserSession,
        "--json",
        "eval",
        `(() => {
          const page = document.querySelector(".unshield-page");
          const ticket = document.querySelector(".unshield-ticket");
          const module = document.querySelector(".unshield-ticket__module");
          const selector = document.querySelector('select[aria-label="Unshield asset"]');
          const exitPreview = document.querySelector(".unshield-exit-preview");
          const exitRecipe = document.querySelector(".unshield-exit-recipe");
          const destinationCard = document.querySelector(".unshield-destination-card");
          const destinationToggle = document.querySelector(".unshield-destination-toggle");
          const destinationToggleInput = document.querySelector(".unshield-destination-toggle input");
          const legacyAssetStrip = document.querySelector(".unshield-balance-strip, .unshield-balance-pill");
          const bodyText = document.body.innerText;
          const normalizedBodyText = bodyText.toLowerCase();
          const previewText = exitPreview instanceof HTMLElement ? exitPreview.innerText.toLowerCase() : "";
          const previewBeforeTicket =
            exitPreview instanceof HTMLElement &&
            ticket instanceof HTMLElement &&
            exitPreview.getBoundingClientRect().top <= ticket.getBoundingClientRect().top;
          const recipeNoOverflow =
            !(exitRecipe instanceof HTMLElement) ||
            exitRecipe.scrollWidth <= exitRecipe.clientWidth + 2;
          const documentOverflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;

          return {
            ok:
              page instanceof HTMLElement &&
              ticket instanceof HTMLElement &&
              module instanceof HTMLElement &&
              selector instanceof HTMLSelectElement &&
              exitPreview instanceof HTMLElement &&
              exitRecipe instanceof HTMLElement &&
              normalizedBodyText.includes("you'll receive") &&
              normalizedBodyText.includes("shielded note") &&
              normalizedBodyText.includes("own wallet") &&
              previewBeforeTicket &&
              recipeNoOverflow &&
              !previewText.includes("fresh wallet") &&
              !previewText.includes("different wallet") &&
              !previewText.includes("private exit") &&
              !previewText.includes("anonymous") &&
              !previewText.includes("untraceable") &&
              !previewText.includes("fully private") &&
              destinationCard instanceof HTMLElement &&
              destinationToggle instanceof HTMLElement &&
              destinationToggleInput instanceof HTMLInputElement &&
              destinationToggleInput.disabled &&
              bodyText.includes("to your own wallet") &&
              bodyText.includes("Send to a different wallet") &&
              bodyText.includes("Coming soon - needs unshield-to-fresh-wallet support") &&
              !bodyText.includes("Shield more") &&
              !bodyText.includes("Share receipt") &&
              !bodyText.includes("View on Solscan") &&
              selector.options.length >= 2 &&
              legacyAssetStrip === null &&
              documentOverflow <= 2,
            documentOverflow,
            hasExitPreview: exitPreview !== null,
            hasExitRecipe: exitRecipe !== null,
            previewBeforeTicket,
            recipeNoOverflow,
            hasDestinationCard: destinationCard !== null,
            hasDestinationToggle: destinationToggle !== null,
            destinationToggleDisabled: destinationToggleInput instanceof HTMLInputElement ? destinationToggleInput.disabled : null,
            hasLegacyAssetStrip: legacyAssetStrip !== null,
            optionCount: selector instanceof HTMLSelectElement ? selector.options.length : 0,
            route: window.location.pathname,
            width: window.innerWidth,
          };
        })()`,
      ],
      { encoding: "utf8" },
    );

    const result = JSON.parse(rawResult);
    const rawValue = result.result ?? result.value ?? result;
    const value = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;

    if (!value.ok) {
      throw new Error(`Unshield asset selector is not compact at ${width}px: ${JSON.stringify(value)}`);
    }
  }
}

function runBrowserBatchWithRetry() {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      runBrowserBatch();
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);

      if (
        !message.includes("daemon exited during startup") &&
        !message.includes("daemon did not start within")
      ) {
        throw error;
      }

      cleanupBrowserLock();
      execFileSync("sleep", [String(0.5 + attempt * 0.5)], { stdio: "ignore" });
    }
  }

  throw lastError;
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
  await waitForVite();
  runBrowserBatchWithRetry();
  assertSendWorkspaceCardCentered();
  assertDesktopProductTabsFit();
  assertActionTabsStayMinimal();
  assertSystemStatusStripLayout();
  assertUnshieldAssetSelectorStaysCompact();
  console.log("vanta product ui browser check: PASS");
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
