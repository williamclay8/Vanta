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
        { kind: "text_visible", text: "Receipt-backed Solana settlement" },
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
        { kind: "selector_visible", selector: "[data-vanta-status-chip]" },
        { kind: "text_visible", text: "Beta" },
        { kind: "text_visible", text: "Shield" },
        { kind: "selector_visible", selector: ".recovery-panel" },
        { kind: "text_visible", text: "Advanced shield settings" },
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
        { kind: "selector_visible", selector: "[data-vanta-status-chip]" },
        { kind: "text_visible", text: "Beta" },
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
        { kind: "text_visible", text: "Vanta is private settlement for Solana stablecoin flows." },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/manifesto` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/manifesto" },
        { kind: "selector_visible", selector: "[data-vanta-manifesto-page]" },
        { kind: "selector_visible", selector: "[data-vanta-manifesto-credo]" },
        { kind: "text_visible", text: "Vanta Manifesto" },
        { kind: "text_visible", text: "Privacy should close the door" },
        { kind: "text_visible", text: "Production privacy is not enabled" },
        { kind: "text_visible", text: "not an audit report" },
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
        { kind: "selector_visible", selector: ".privacy-summary" },
        { kind: "selector_visible", selector: "[data-vanta-send-recipient-input]" },
        { kind: "selector_visible", selector: "[data-vanta-send-recipient-status]" },
        { kind: "selector_visible", selector: "[data-vanta-send-advanced-panel]" },
        { kind: "text_visible", text: "Send" },
        { kind: "text_visible", text: "Privacy summary" },
        { kind: "text_visible", text: "Chain sees" },
        { kind: "text_visible", text: "Operator sees" },
        { kind: "text_visible", text: "Advanced send settings" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/dashboard` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/dashboard" },
        { kind: "selector_visible", selector: ".dashboard-page--cockpit" },
        { kind: "selector_visible", selector: ".dashboard-cockpit__balance-card" },
        { kind: "selector_visible", selector: ".dashboard-next-step-card" },
        { kind: "selector_visible", selector: ".dashboard-cockpit__proof-link" },
        { kind: "text_visible", text: "Your shielded portfolio" },
        { kind: "text_visible", text: "Shielded balance" },
        { kind: "text_visible", text: "Spendable notes" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/app/proof` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/proof" },
        { kind: "selector_visible", selector: ".proof-lane-trust" },
        { kind: "selector_visible", selector: ".dashboard-trust-packet" },
        { kind: "selector_visible", selector: ".dashboard-verification-card" },
        { kind: "selector_visible", selector: ".landing-depth-disclosure" },
        { kind: "text_visible", text: "Trust status" },
        { kind: "text_visible", text: "Shield: Claim locked" },
        { kind: "text_visible", text: "Latest Trust Packet" },
        { kind: "text_visible", text: "Reviewer Verification" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'a[href="/app/shield"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/shield" },
        { kind: "selector_visible", selector: "[data-vanta-status-chip]" },
        { kind: "text_visible", text: "Beta" },
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
        { kind: "selector_visible", selector: ".privacy-summary" },
        { kind: "selector_visible", selector: "[data-vanta-swap-advanced-panel]" },
        { kind: "selector_visible", selector: "[data-vanta-quote-countdown-bar]" },
        { kind: "text_visible", text: "Swap" },
        { kind: "text_visible", text: "Privacy summary" },
        { kind: "text_visible", text: "Chain sees" },
        { kind: "text_visible", text: "Venue sees" },
        { kind: "text_visible", text: "Advanced swap settings" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: ".app-header__more > button" },
    { action: "click", selector: '.app-header__more-menu a[href="/app/strategy"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/strategy" },
        { kind: "selector_visible", selector: "[data-vanta-status-chip]" },
        { kind: "text_visible", text: "Beta" },
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
        { kind: "selector_visible", selector: ".privacy-summary" },
        { kind: "selector_visible", selector: "[data-vanta-unshield-advanced-panel]" },
        { kind: "text_visible", text: "Unshield" },
        { kind: "text_visible", text: "Privacy summary" },
        { kind: "text_visible", text: "Chain sees" },
        { kind: "text_visible", text: "Operator sees" },
        { kind: "text_visible", text: "Advanced unshield settings" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: ".app-header__more > button" },
    { action: "click", selector: '.app-header__more-menu a[href="/app/pay"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/app/pay" },
        { kind: "selector_visible", selector: "[data-vanta-status-chip]" },
        { kind: "text_visible", text: "Beta" },
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

function assertShieldRecoveryPanelDisclosure() {
  execFileSync("gsd-browser", ["--session", browserSession, "set-viewport", "--width", "1440", "--height", "1000"], {
    stdio: "ignore",
  });
  execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}/app/shield`], {
    stdio: "ignore",
  });
  execFileSync("gsd-browser", ["--session", browserSession, "wait-for", "--condition", "network_idle"], {
    stdio: "ignore",
  });

  const rawBefore = execFileSync(
    "gsd-browser",
    [
      "--session",
      browserSession,
      "--json",
      "eval",
      `(() => {
        const panel = document.querySelector(".recovery-panel");
        const packetField = document.querySelector(".recovery-panel textarea[readonly]");

        return {
          ok: panel instanceof HTMLDetailsElement && !panel.open && packetField instanceof HTMLTextAreaElement,
          hasPacketField: packetField instanceof HTMLTextAreaElement,
          open: panel instanceof HTMLDetailsElement ? panel.open : null,
        };
      })()`,
    ],
    { encoding: "utf8" },
  );
  const beforeResult = JSON.parse(rawBefore);
  const beforeRawValue = beforeResult.result ?? beforeResult.value ?? beforeResult;
  const before = typeof beforeRawValue === "string" ? JSON.parse(beforeRawValue) : beforeRawValue;

  if (!before.ok) {
    throw new Error(`Shield recovery panel is not closed with packet field ready: ${JSON.stringify(before)}`);
  }

  execFileSync(
    "gsd-browser",
    [
      "--session",
      browserSession,
      "eval",
      `document.querySelector(".recovery-panel summary")?.click()`,
    ],
    { stdio: "ignore" },
  );

  const rawAfter = execFileSync(
    "gsd-browser",
    [
      "--session",
      browserSession,
      "--json",
      "eval",
      `(() => {
        const panel = document.querySelector(".recovery-panel");
        const panelText = panel?.textContent ?? "";
        const documentOverflow =
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
          window.innerWidth;

        return {
          ok:
            panel instanceof HTMLDetailsElement &&
            panel.open &&
            panelText.includes("Viewing key backup") &&
            panelText.includes("Owner recovery evidence") &&
            panelText.includes("Record source packet") &&
            panelText.includes("Restore on this browser") &&
            documentOverflow <= 2,
          documentOverflow,
          open: panel instanceof HTMLDetailsElement ? panel.open : null,
          panelText,
        };
      })()`,
    ],
    { encoding: "utf8" },
  );
  const afterResult = JSON.parse(rawAfter);
  const afterRawValue = afterResult.result ?? afterResult.value ?? afterResult;
  const after = typeof afterRawValue === "string" ? JSON.parse(afterRawValue) : afterRawValue;

  if (!after.ok) {
    throw new Error(`Shield recovery panel did not reveal recovery controls: ${JSON.stringify(after)}`);
  }
}

function assertRecoverySettingsRoute() {
  for (const width of [1440, 390, 320]) {
    execFileSync(
      "gsd-browser",
      ["--session", browserSession, "set-viewport", "--width", String(width), "--height", "1000"],
      {
        stdio: "ignore",
      },
    );
    execFileSync(
      "gsd-browser",
      ["--session", browserSession, "navigate", `${baseUrl}/app/settings/recovery`],
      {
        stdio: "ignore",
      },
    );
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
          const route = document.querySelector("[data-vanta-recovery-settings-route]");
          const panel = document.querySelector(".recovery-panel");
          const moreTrigger = document.querySelector(".app-header__more > button");
          const routeText = route?.textContent ?? "";
          const panelText = panel?.textContent ?? "";
          const documentOverflow =
            Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            window.innerWidth;

          return {
            ok:
              route instanceof HTMLElement &&
              panel instanceof HTMLDetailsElement &&
              panel.open &&
              moreTrigger instanceof HTMLButtonElement &&
              moreTrigger.textContent?.includes("Recovery") &&
              routeText.includes("Recovery settings") &&
              routeText.includes("Beta recovery boundary") &&
              routeText.includes("do not enable recovery production privacy") &&
              panelText.includes("Viewing key backup") &&
              panelText.includes("Owner recovery evidence") &&
              panelText.includes("Record source packet") &&
              panelText.includes("Restore on this browser") &&
              documentOverflow <= 2,
            documentOverflow,
            moreText: moreTrigger?.textContent ?? "",
            panelOpen: panel instanceof HTMLDetailsElement ? panel.open : null,
            routeText,
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
      throw new Error(`Recovery settings route failed browser assertion: ${JSON.stringify(value)}`);
    }
  }
}

function assertPayTransactionStatusToast() {
  for (const width of [1440, 390, 320]) {
    execFileSync(
      "gsd-browser",
      ["--session", browserSession, "set-viewport", "--width", String(width), "--height", "1000"],
      {
        stdio: "ignore",
      },
    );
    execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}/app/pay`], {
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
          const toast = document.querySelector(".transaction-status-toast.pay-path-card");
          const toastText = toast?.textContent ?? "";
          const documentOverflow =
            Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            window.innerWidth;

          return {
            ok:
              toast instanceof HTMLElement &&
              toast.getAttribute("role") === "status" &&
              toast.getAttribute("aria-live") === "polite" &&
              toast.getAttribute("data-transaction-status") === "pending" &&
              toastText.includes("Transaction status") &&
              toastText.includes("Live approval and execution are locked in beta.") &&
              toastText.includes("Receipt packet pending") &&
              documentOverflow <= 2,
            ariaBusy: toast instanceof HTMLElement ? toast.getAttribute("aria-busy") : null,
            documentOverflow,
            role: toast instanceof HTMLElement ? toast.getAttribute("role") : null,
            text: toastText,
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
      throw new Error(`Pay TransactionStatusToast failed browser assertion: ${JSON.stringify(value)}`);
    }
  }
}

function assertSwapQuoteCountdownBar() {
  for (const width of [1440, 390, 320]) {
    execFileSync(
      "gsd-browser",
      ["--session", browserSession, "set-viewport", "--width", String(width), "--height", "1000"],
      {
        stdio: "ignore",
      },
    );
    execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}/app/swap`], {
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
          const bar = document.querySelector("[data-vanta-quote-countdown-bar]");
          const fill = document.querySelector(".quote-countdown-bar__fill");
          const module = document.querySelector(".swap-module");
          const routeCard = document.querySelector(".swap-route-card");
          const barRect = bar instanceof HTMLElement ? bar.getBoundingClientRect() : null;
          const routeCardRect = routeCard instanceof HTMLElement ? routeCard.getBoundingClientRect() : null;
          const ariaValueNow =
            bar instanceof HTMLElement ? Number(bar.getAttribute("aria-valuenow")) : Number.NaN;
          const documentOverflow =
            Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            window.innerWidth;

          return {
            ok:
              bar instanceof HTMLElement &&
              fill instanceof HTMLElement &&
              module instanceof HTMLElement &&
              bar.getAttribute("role") === "progressbar" &&
              bar.getAttribute("aria-label")?.includes("Quote") &&
              bar.getAttribute("aria-valuemin") === "0" &&
              bar.getAttribute("aria-valuemax") === "100" &&
              Number.isFinite(ariaValueNow) &&
              ariaValueNow >= 0 &&
              ariaValueNow <= 100 &&
              barRect.width > 0 &&
              barRect.height >= 4 &&
              (!routeCardRect || barRect.top <= routeCardRect.top) &&
              documentOverflow <= 2,
            ariaLabel: bar instanceof HTMLElement ? bar.getAttribute("aria-label") : null,
            ariaValueNow,
            barHeight: barRect?.height ?? 0,
            barTop: barRect?.top ?? 0,
            documentOverflow,
            hasFill: fill instanceof HTMLElement,
            role: bar instanceof HTMLElement ? bar.getAttribute("role") : null,
            routeCardTop: routeCardRect?.top ?? null,
            tone: bar instanceof HTMLElement ? bar.getAttribute("data-quote-countdown-tone") : null,
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
      throw new Error(`Swap QuoteCountdownBar failed browser assertion: ${JSON.stringify(value)}`);
    }
  }
}

function assertSwapReceiptModalIdleHidden() {
  for (const width of [1440, 390, 320]) {
    execFileSync(
      "gsd-browser",
      ["--session", browserSession, "set-viewport", "--width", String(width), "--height", "1000"],
      {
        stdio: "ignore",
      },
    );
    execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}/app/swap`], {
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
          const modal = document.querySelector("[data-vanta-swap-receipt-modal]");
          const bodyText = document.body.innerText;
          const documentOverflow =
            Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            window.innerWidth;

          return {
            ok:
              modal === null &&
              !bodyText.includes("View swap receipt") &&
              !bodyText.includes("Latest swap receipt") &&
              documentOverflow <= 2,
            documentOverflow,
            hasModal: modal !== null,
            hasReceiptCta: bodyText.includes("View swap receipt"),
            hasReceiptTitle: bodyText.includes("Latest swap receipt"),
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
      throw new Error(`Swap receipt modal should stay hidden before completion: ${JSON.stringify(value)}`);
    }
  }
}

function assertSendReceiptModalIdleHidden() {
  for (const width of [1440, 390, 320]) {
    execFileSync(
      "gsd-browser",
      ["--session", browserSession, "set-viewport", "--width", String(width), "--height", "1000"],
      {
        stdio: "ignore",
      },
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
          const modal = document.querySelector("[data-vanta-send-receipt-modal]");
          const bodyText = document.body.innerText;
          const documentOverflow =
            Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            window.innerWidth;

          return {
            ok:
              modal === null &&
              !bodyText.includes("View send receipt") &&
              !bodyText.includes("Latest send receipt") &&
              documentOverflow <= 2,
            documentOverflow,
            hasModal: modal !== null,
            hasReceiptCta: bodyText.includes("View send receipt"),
            hasReceiptTitle: bodyText.includes("Latest send receipt"),
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
      throw new Error(`Send receipt modal should stay hidden before completion: ${JSON.stringify(value)}`);
    }
  }
}

function assertSendRecipientValidation() {
  for (const width of [1440, 390, 320]) {
    execFileSync(
      "gsd-browser",
      ["--session", browserSession, "set-viewport", "--width", String(width), "--height", "1000"],
      {
        stdio: "ignore",
      },
    );
    execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}/app/send`], {
      stdio: "ignore",
    });
    execFileSync("gsd-browser", ["--session", browserSession, "wait-for", "--condition", "network_idle"], {
      stdio: "ignore",
    });

    execFileSync(
      "gsd-browser",
      [
        "--session",
        browserSession,
        "eval",
        `(() => {
          const input = document.querySelector("[data-vanta-send-recipient-input]");
          const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

          if (!(input instanceof HTMLInputElement) || !valueSetter) {
            return;
          }

          valueSetter.call(input, "clay.sol");
          input.dispatchEvent(new Event("input", { bubbles: true }));
        })()`,
      ],
      { stdio: "ignore" },
    );
    execFileSync("sleep", ["0.1"], { stdio: "ignore" });

    const rawResult = execFileSync(
      "gsd-browser",
      [
        "--session",
        browserSession,
        "--json",
        "eval",
        `(() => {
          const input = document.querySelector("[data-vanta-send-recipient-input]");
          const helper = document.querySelector("[data-vanta-send-recipient-helper]");
          const status = document.querySelector("[data-vanta-send-recipient-status]");
          const primaryAction = document.querySelector("[data-vanta-send-primary-action]");
          const proofPanel = document.querySelector("[data-vanta-send-proof-panel]");
          const advancedPanel = document.querySelector("[data-vanta-send-advanced-panel]");
          const ledgerGate = document.querySelector("[data-vanta-send-ledger-gate-status]");
          const helperText = helper instanceof HTMLElement ? helper.textContent ?? "" : "";
          const statusText = status instanceof HTMLElement ? status.textContent ?? "" : "";
          const bodyText = document.body.innerText;
          const normalizedBodyText = bodyText.toLowerCase();
          const forbiddenClaims = [
            "resolved .sol",
            "recipient verified",
            "recipient owns",
            "private delivery",
            "production-private send",
            "fully private send",
          ];
          const forbiddenFound = forbiddenClaims.filter((claim) => normalizedBodyText.includes(claim));
          const documentOverflow =
            Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            window.innerWidth;

          return {
            ok:
              input instanceof HTMLInputElement &&
              input.placeholder === "Recipient wallet address" &&
              !input.placeholder.includes(".sol") &&
              helper instanceof HTMLElement &&
              (helperText.includes(".sol resolution") || helperText.includes(".sol names")) &&
              status instanceof HTMLElement &&
              statusText.includes("Solana name resolution required") &&
              statusText.includes("Paste the resolved Solana wallet address") &&
              primaryAction instanceof HTMLButtonElement &&
              primaryAction.disabled &&
              proofPanel instanceof HTMLElement &&
              advancedPanel instanceof HTMLDetailsElement &&
              ledgerGate instanceof HTMLElement &&
              bodyText.includes(".sol resolution") &&
              !bodyText.includes("Solana address or .sol name") &&
              forbiddenFound.length === 0 &&
              documentOverflow <= 2,
            advancedPanelTag: advancedPanel?.tagName ?? null,
            documentOverflow,
            forbiddenFound,
            helperText,
            placeholder: input instanceof HTMLInputElement ? input.placeholder : null,
            primaryDisabled: primaryAction instanceof HTMLButtonElement ? primaryAction.disabled : null,
            statusText,
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
      throw new Error(`Send recipient validation failed browser assertion: ${JSON.stringify(value)}`);
    }
  }
}

function assertUnshieldReceiptModalIdleHidden() {
  for (const width of [1440, 390, 320]) {
    execFileSync(
      "gsd-browser",
      ["--session", browserSession, "set-viewport", "--width", String(width), "--height", "1000"],
      {
        stdio: "ignore",
      },
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
          const modal = document.querySelector("[data-vanta-unshield-receipt-modal]");
          const bodyText = document.body.innerText;
          const documentOverflow =
            Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            window.innerWidth;

          return {
            ok:
              modal === null &&
              !bodyText.includes("View receipt details") &&
              !bodyText.includes("Latest unshield receipt") &&
              !bodyText.includes("View on Solscan") &&
              documentOverflow <= 2,
            documentOverflow,
            hasModal: modal !== null,
            hasReceiptCta: bodyText.includes("View receipt details"),
            hasReceiptTitle: bodyText.includes("Latest unshield receipt"),
            hasSolscanLink: bodyText.includes("View on Solscan"),
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
      throw new Error(`Unshield receipt modal should stay hidden before completion: ${JSON.stringify(value)}`);
    }
  }
}

function assertSendAdvancedDisclosure() {
  execFileSync("gsd-browser", ["--session", browserSession, "set-viewport", "--width", "1440", "--height", "1000"], {
    stdio: "ignore",
  });
  execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}/app/send`], {
    stdio: "ignore",
  });
  execFileSync("gsd-browser", ["--session", browserSession, "wait-for", "--condition", "network_idle"], {
    stdio: "ignore",
  });

  const rawBefore = execFileSync(
    "gsd-browser",
    [
      "--session",
      browserSession,
      "--json",
      "eval",
      `(() => {
        const panel = document.querySelector(".send-advanced-panel");
        const noteSelect = document.querySelector(".send-advanced-panel select");

        return {
          ok: panel instanceof HTMLDetailsElement && !panel.open && noteSelect instanceof HTMLSelectElement,
          hasNoteSelect: noteSelect instanceof HTMLSelectElement,
          open: panel instanceof HTMLDetailsElement ? panel.open : null,
        };
      })()`,
    ],
    { encoding: "utf8" },
  );
  const beforeResult = JSON.parse(rawBefore);
  const beforeRawValue = beforeResult.result ?? beforeResult.value ?? beforeResult;
  const before = typeof beforeRawValue === "string" ? JSON.parse(beforeRawValue) : beforeRawValue;

  if (!before.ok) {
    throw new Error(`Send advanced disclosure is not closed with note selection ready: ${JSON.stringify(before)}`);
  }

  execFileSync(
    "gsd-browser",
    [
      "--session",
      browserSession,
      "eval",
      `document.querySelector(".send-advanced-panel summary")?.click()`,
    ],
    { stdio: "ignore" },
  );

  const rawAfter = execFileSync(
    "gsd-browser",
    [
      "--session",
      browserSession,
      "--json",
      "eval",
      `(() => {
        const panel = document.querySelector(".send-advanced-panel");
        const panelText = panel?.textContent ?? "";

        return {
          ok:
            panel instanceof HTMLDetailsElement &&
            panel.open &&
            panelText.includes("Custom note selection") &&
            panelText.includes("Encrypted recipient memo") &&
            panelText.includes("Spent marker"),
          open: panel instanceof HTMLDetailsElement ? panel.open : null,
          panelText,
        };
      })()`,
    ],
    { encoding: "utf8" },
  );
  const afterResult = JSON.parse(rawAfter);
  const afterRawValue = afterResult.result ?? afterResult.value ?? afterResult;
  const after = typeof afterRawValue === "string" ? JSON.parse(afterRawValue) : afterRawValue;

  if (!after.ok) {
    throw new Error(`Send advanced disclosure did not reveal advanced controls: ${JSON.stringify(after)}`);
  }
}

function assertSwapAdvancedDisclosure() {
  execFileSync("gsd-browser", ["--session", browserSession, "set-viewport", "--width", "1440", "--height", "1000"], {
    stdio: "ignore",
  });
  execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}/app/swap`], {
    stdio: "ignore",
  });
  execFileSync("gsd-browser", ["--session", browserSession, "wait-for", "--condition", "network_idle"], {
    stdio: "ignore",
  });

  const rawBefore = execFileSync(
    "gsd-browser",
    [
      "--session",
      browserSession,
      "--json",
      "eval",
      `(() => {
        const panel = document.querySelector("[data-vanta-swap-advanced-panel]");
        const noteSelect = document.querySelector("[data-vanta-swap-advanced-panel] select");

        return {
          ok: panel instanceof HTMLDetailsElement && !panel.open && noteSelect instanceof HTMLSelectElement,
          hasNoteSelect: noteSelect instanceof HTMLSelectElement,
          open: panel instanceof HTMLDetailsElement ? panel.open : null,
        };
      })()`,
    ],
    { encoding: "utf8" },
  );
  const beforeResult = JSON.parse(rawBefore);
  const beforeRawValue = beforeResult.result ?? beforeResult.value ?? beforeResult;
  const before = typeof beforeRawValue === "string" ? JSON.parse(beforeRawValue) : beforeRawValue;

  if (!before.ok) {
    throw new Error(`Swap advanced disclosure is not closed with note selection ready: ${JSON.stringify(before)}`);
  }

  execFileSync(
    "gsd-browser",
    [
      "--session",
      browserSession,
      "eval",
      `document.querySelector("[data-vanta-swap-advanced-panel] summary")?.click()`,
    ],
    { stdio: "ignore" },
  );

  const rawAfter = execFileSync(
    "gsd-browser",
    [
      "--session",
      browserSession,
      "--json",
      "eval",
      `(() => {
        const panel = document.querySelector("[data-vanta-swap-advanced-panel]");
        const panelText = panel?.textContent ?? "";

        return {
          ok:
            panel instanceof HTMLDetailsElement &&
            panel.open &&
            panelText.includes("Max slippage") &&
            panelText.includes("Note selection") &&
            panelText.includes("Venue routing"),
          open: panel instanceof HTMLDetailsElement ? panel.open : null,
          panelText,
        };
      })()`,
    ],
    { encoding: "utf8" },
  );
  const afterResult = JSON.parse(rawAfter);
  const afterRawValue = afterResult.result ?? afterResult.value ?? afterResult;
  const after = typeof afterRawValue === "string" ? JSON.parse(afterRawValue) : afterRawValue;

  if (!after.ok) {
    throw new Error(`Swap advanced disclosure did not reveal advanced controls: ${JSON.stringify(after)}`);
  }
}

function assertUnshieldAdvancedDisclosure() {
  execFileSync("gsd-browser", ["--session", browserSession, "set-viewport", "--width", "1440", "--height", "1000"], {
    stdio: "ignore",
  });
  execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}/app/unshield`], {
    stdio: "ignore",
  });
  execFileSync("gsd-browser", ["--session", browserSession, "wait-for", "--condition", "network_idle"], {
    stdio: "ignore",
  });

  const rawBefore = execFileSync(
    "gsd-browser",
    [
      "--session",
      browserSession,
      "--json",
      "eval",
      `(() => {
        const panel = document.querySelector("[data-vanta-unshield-advanced-panel]");
        const noteSelect = document.querySelector("[data-vanta-unshield-advanced-panel] select");

        return {
          ok: panel instanceof HTMLDetailsElement && !panel.open && noteSelect instanceof HTMLSelectElement,
          hasNoteSelect: noteSelect instanceof HTMLSelectElement,
          open: panel instanceof HTMLDetailsElement ? panel.open : null,
        };
      })()`,
    ],
    { encoding: "utf8" },
  );
  const beforeResult = JSON.parse(rawBefore);
  const beforeRawValue = beforeResult.result ?? beforeResult.value ?? beforeResult;
  const before = typeof beforeRawValue === "string" ? JSON.parse(beforeRawValue) : beforeRawValue;

  if (!before.ok) {
    throw new Error(`Unshield advanced disclosure is not closed with note selection ready: ${JSON.stringify(before)}`);
  }

  execFileSync(
    "gsd-browser",
    [
      "--session",
      browserSession,
      "eval",
      `document.querySelector("[data-vanta-unshield-advanced-panel] summary")?.click()`,
    ],
    { stdio: "ignore" },
  );

  const rawAfter = execFileSync(
    "gsd-browser",
    [
      "--session",
      browserSession,
      "--json",
      "eval",
      `(() => {
        const panel = document.querySelector("[data-vanta-unshield-advanced-panel]");
        const panelText = panel?.textContent ?? "";

        return {
          ok:
            panel instanceof HTMLDetailsElement &&
            panel.open &&
            panelText.includes("Custom note selection") &&
            panelText.includes("Reference note for receipt"),
          open: panel instanceof HTMLDetailsElement ? panel.open : null,
          panelText,
        };
      })()`,
    ],
    { encoding: "utf8" },
  );
  const afterResult = JSON.parse(rawAfter);
  const afterRawValue = afterResult.result ?? afterResult.value ?? afterResult;
  const after = typeof afterRawValue === "string" ? JSON.parse(afterRawValue) : afterRawValue;

  if (!after.ok) {
    throw new Error(`Unshield advanced disclosure did not reveal advanced controls: ${JSON.stringify(after)}`);
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

function assertLaneFlowIndicators() {
  const cases = [
    {
      activeText: "Choose",
      ariaLabel: "Shield flow",
      expectedActiveCount: 1,
      labels: ["Choose", "Approve", "Private note"],
      route: "/app/shield",
    },
    {
      activeText: "Send",
      ariaLabel: "Send flow",
      expectedActiveCount: 1,
      labels: ["Shield", "Send", "Hold change"],
      route: "/app/send",
    },
    {
      activeText: "Choose trade",
      ariaLabel: "Swap flow",
      expectedActiveCount: 1,
      labels: ["Choose trade", "Quote", "Settle", "Receive note"],
      route: "/app/swap",
    },
    {
      activeText: "Unshield",
      ariaLabel: "Unshield flow",
      expectedActiveCount: 1,
      labels: ["Shield", "Hold", "Unshield"],
      route: "/app/unshield",
    },
    {
      ariaLabel: "Pay flow",
      expectedActiveCount: 0,
      labels: ["Create", "Approve", "Settle", "Share receipt"],
      route: "/app/pay",
    },
    {
      activeText: "Preview plan",
      ariaLabel: "Strategy flow",
      expectedActiveCount: 1,
      labels: ["Choose route", "Preview plan", "Verify packet", "Execute later"],
      route: "/app/strategy",
    },
  ];

  for (const flowCase of cases) {
    for (const width of [1440, 390, 320]) {
      execFileSync(
        "gsd-browser",
        ["--session", browserSession, "set-viewport", "--width", String(width), "--height", "900"],
        { stdio: "ignore" },
      );
      execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}${flowCase.route}`], {
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
          `(flowCase => {
            const indicator = document.querySelector(
              \`.lane-flow-indicator[aria-label="\${flowCase.ariaLabel}"]\`,
            );
            const activeSteps = indicator?.querySelectorAll(".lane-flow-step--active") ?? [];
            const activeText = Array.from(activeSteps)
              .map((step) => step.textContent?.trim() ?? "")
              .join(" | ");
            const indicatorText = indicator?.textContent ?? "";
            const missingLabels = flowCase.labels.filter((label) => !indicatorText.includes(label));
            const documentOverflow =
              Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
              window.innerWidth;
            const indicatorRect = indicator instanceof HTMLElement ? indicator.getBoundingClientRect() : null;
            const activeStep = activeSteps[0];
            const activeStepAnimationName =
              activeStep instanceof HTMLElement
                ? window.getComputedStyle(activeStep, "::after").animationName
                : "";
            const activeAnimationOk =
              flowCase.expectedActiveCount === 0 || activeStepAnimationName.includes("lane-flow-sweep");

            return {
              ok:
                indicator instanceof HTMLElement &&
                indicatorRect.width > 0 &&
                indicatorRect.height > 0 &&
                activeSteps.length === flowCase.expectedActiveCount &&
                missingLabels.length === 0 &&
                (!flowCase.activeText || activeText.includes(flowCase.activeText)) &&
                activeAnimationOk &&
                documentOverflow <= 2,
              activeAnimationOk,
              activeStepAnimationName,
              activeSteps: activeSteps.length,
              activeText,
              documentOverflow,
              hasIndicator: indicator instanceof HTMLElement,
              indicatorHeight: indicatorRect?.height ?? 0,
              indicatorWidth: indicatorRect?.width ?? 0,
              missingLabels,
              route: window.location.pathname,
              width: window.innerWidth,
            };
          })(${JSON.stringify(flowCase)})`,
        ],
        { encoding: "utf8" },
      );

      const result = JSON.parse(rawResult);
      const rawValue = result.result ?? result.value ?? result;
      const value = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;

      if (!value.ok) {
        throw new Error(`Lane flow indicator check failed: ${JSON.stringify(value)}`);
      }
    }
  }
}

function assertAssetPickerGrids() {
  const cases = [
    {
      labels: ["Shield source asset", "Shield target asset"],
      route: "/app/shield",
    },
  ];

  for (const assetCase of cases) {
    for (const width of [1440, 390, 320]) {
      execFileSync(
        "gsd-browser",
        ["--session", browserSession, "set-viewport", "--width", String(width), "--height", "900"],
        { stdio: "ignore" },
      );
      execFileSync("gsd-browser", ["--session", browserSession, "navigate", `${baseUrl}${assetCase.route}`], {
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
          `(assetCase => {
            const bodyText = document.body.innerText;
            const normalizedBodyText = bodyText.toLowerCase();
            const missingPickers = assetCase.labels.filter(
              (label) => !(document.querySelector(\`.asset-picker-grid[aria-label="\${label}"]\`) instanceof HTMLElement),
            );
            const legacySelects = Array.from(
              document.querySelectorAll(
                'select[aria-label="From asset"], select[aria-label="From shielded asset"], select[aria-label="To shielded asset"]',
              ),
            ).map((select) => select.getAttribute("aria-label"));
            const grids = Array.from(document.querySelectorAll(".asset-picker-grid"));
            const swapSourcePicker = document.querySelector('.asset-picker-grid[aria-label="From shielded asset"]');
            const swapSourceOptionCount =
              swapSourcePicker instanceof HTMLElement
                ? swapSourcePicker.querySelectorAll(".asset-picker-grid__option").length
                : 0;
            const swapSourcePickerText =
              swapSourcePicker instanceof HTMLElement ? swapSourcePicker.textContent ?? "" : "";
            const disabledOptionCount = document.querySelectorAll(".asset-picker-grid__option--disabled").length;
            const documentOverflow =
              Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
              window.innerWidth;
            const gridOverflow = grids.reduce(
              (max, grid) =>
                grid instanceof HTMLElement ? Math.max(max, grid.scrollWidth - grid.clientWidth) : max,
              0,
            );
            const swapTruthOk =
              assetCase.route !== "/app/swap" ||
              (normalizedBodyText.includes("operator-visible") &&
                (swapSourcePickerText.includes("No shielded assets ready") || swapSourceOptionCount > 0) &&
                disabledOptionCount > 0);
            const shieldTruthOk =
              assetCase.route !== "/app/shield" ||
              (bodyText.includes("Route:") && !bodyText.toLowerCase().includes("production private"));

            return {
              ok:
                missingPickers.length === 0 &&
                legacySelects.length === 0 &&
                grids.length >= assetCase.labels.length &&
                documentOverflow <= 2 &&
                gridOverflow <= 2 &&
                swapTruthOk &&
                shieldTruthOk,
              disabledOptionCount,
              documentOverflow,
              gridCount: grids.length,
              gridOverflow,
              legacySelects,
              missingPickers,
              route: window.location.pathname,
              shieldTruthOk,
              swapSourceOptionCount,
              swapSourcePickerText,
              swapTruthOk,
              width: window.innerWidth,
            };
          })(${JSON.stringify(assetCase)})`,
        ],
        { encoding: "utf8" },
      );

      const result = JSON.parse(rawResult);
      const rawValue = result.result ?? result.value ?? result;
      const value = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;

      if (!value.ok) {
        throw new Error(`Asset picker grid check failed: ${JSON.stringify(value)}`);
      }
    }
  }
}

function assertAppStatusChipLayout() {
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
            const chip = document.querySelector("[data-vanta-status-chip]");
            const header = document.querySelector(".app-header");
            const tabs = document.querySelector(".app-header__tabs");
            const bodyText = document.body.innerText;

            if (
              !(chip instanceof HTMLElement) ||
              !(header instanceof HTMLElement) ||
              !(tabs instanceof HTMLElement)
            ) {
              return {
                ok: false,
                reason: "status chip, app header, or tabs missing",
                route: window.location.pathname,
                width: window.innerWidth,
              };
            }

            const chipRect = chip.getBoundingClientRect();
            const headerRect = header.getBoundingClientRect();
            const tabsRect = tabs.getBoundingClientRect();
            const documentOverflow =
              Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
              window.innerWidth;
            const chipOverflow = chip.scrollWidth - chip.clientWidth;
            const headerOverflow = header.scrollWidth - header.clientWidth;
            const chipInsideHeader =
              chipRect.top >= headerRect.top - 2 &&
              chipRect.bottom <= headerRect.bottom + 2;
            const tabsReachable =
              tabsRect.width > 0 &&
              tabsRect.height > 0 &&
              tabsRect.top < window.innerHeight &&
              tabsRect.bottom > 0;
            const hasBetaChip = bodyText.toLowerCase().includes("beta");

            return {
              ok:
                documentOverflow <= 2 &&
                chipOverflow <= 2 &&
                headerOverflow <= 2 &&
                chipInsideHeader &&
                tabsReachable &&
                hasBetaChip,
              chipInsideHeader,
              documentOverflow,
              hasBetaChip,
              headerOverflow,
              route: window.location.pathname,
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
        throw new Error(`App status chip layout failed: ${JSON.stringify(value)}`);
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
  assertShieldRecoveryPanelDisclosure();
  assertRecoverySettingsRoute();
  assertPayTransactionStatusToast();
  assertSwapQuoteCountdownBar();
  assertSendRecipientValidation();
  assertSendReceiptModalIdleHidden();
  assertSwapReceiptModalIdleHidden();
  assertUnshieldReceiptModalIdleHidden();
  assertSendAdvancedDisclosure();
  assertSwapAdvancedDisclosure();
  assertUnshieldAdvancedDisclosure();
  assertDesktopProductTabsFit();
  assertActionTabsStayMinimal();
  assertLaneFlowIndicators();
  assertAssetPickerGrids();
  assertAppStatusChipLayout();
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
