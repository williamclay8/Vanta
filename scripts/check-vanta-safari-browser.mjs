import { execFileSync, spawn } from "node:child_process";

const vitePort = 5480 + Math.floor(Math.random() * 200);
const driverPort = 7480 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${vitePort}`;
const webdriverUrl = `http://127.0.0.1:${driverPort}`;

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForVite() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/app/send`);
      if (response.ok) {
        return;
      }
    } catch {
      // Vite is still booting.
    }

    await sleep(250);
  }

  throw new Error("Vanta dev server did not become ready for Safari browser verification.");
}

async function waitForSafariDriver(processRef) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (processRef.exitCode !== null) {
      throw new Error("safaridriver exited before accepting WebDriver requests.");
    }

    try {
      const response = await fetch(`${webdriverUrl}/status`);
      if (response.ok) {
        return;
      }
    } catch {
      // safaridriver is still booting.
    }

    await sleep(250);
  }

  throw new Error("safaridriver did not become ready for Safari browser verification.");
}

async function webdriver(method, path, body) {
  const response = await fetch(`${webdriverUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.value?.message ?? JSON.stringify(payload);
    if (message.includes("Allow remote automation")) {
      throw new Error(
        "Safari remote automation is disabled. Enable Safari Settings > Developer > Allow Remote Automation, then rerun npm run safari:browser-check.",
      );
    }

    throw new Error(`Safari WebDriver request failed (${method} ${path}): ${message}`);
  }

  return payload.value;
}

async function createSession() {
  const value = await webdriver("POST", "/session", {
    capabilities: {
      alwaysMatch: {
        browserName: "safari",
      },
    },
  });

  return value.sessionId;
}

async function navigate(sessionId, url) {
  await webdriver("POST", `/session/${sessionId}/url`, { url });
}

async function execute(sessionId, script) {
  return webdriver("POST", `/session/${sessionId}/execute/sync`, {
    script,
    args: [],
  });
}

async function runRouteSmoke(sessionId, route, expectedText) {
  await navigate(sessionId, `${baseUrl}${route}`);
  await sleep(750);

  const result = await execute(
    sessionId,
    `return {
      path: location.pathname,
      title: document.title,
      readyState: document.readyState,
      bodyText: document.body ? document.body.innerText : "",
      hasRoot: document.querySelector("#root") instanceof HTMLElement,
      hasAppShell: document.querySelector(".app-header__brand, .landing-nav__wordmark, .docs-shell, .docs-layout") instanceof HTMLElement,
      horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
      blankRoot: (document.querySelector("#root")?.textContent || "").trim().length === 0,
    };`,
  );

  if (result.path !== route) {
    throw new Error(`Safari route smoke expected ${route}, got ${result.path}.`);
  }

  if (result.readyState !== "complete" || !result.hasRoot || result.blankRoot || !result.hasAppShell) {
    throw new Error(`Safari route smoke found an unready or blank app shell on ${route}: ${JSON.stringify(result)}`);
  }

  if (!result.bodyText.includes(expectedText)) {
    throw new Error(`Safari route smoke missing expected text on ${route}: ${expectedText}`);
  }

  if (result.horizontalOverflow > 4) {
    throw new Error(`Safari route smoke found horizontal overflow on ${route}: ${result.horizontalOverflow}px.`);
  }
}

async function runWalletFallbackSmoke(sessionId) {
  await navigate(sessionId, `${baseUrl}/app/send?mobile-wallet-prompt=1`);
  await sleep(750);

  const shellPrompt = await execute(
    sessionId,
    `return {
      path: location.pathname,
      search: location.search,
      hasPrompt: document.querySelector(".mobile-wallet-open-prompt") instanceof HTMLElement,
      promptText: document.querySelector(".mobile-wallet-open-prompt")?.textContent || "",
      phantomHref: document.querySelector('.mobile-wallet-open-prompt a[data-wallet-open="phantom"]')?.href || null,
      solflareHref: document.querySelector('.mobile-wallet-open-prompt a[data-wallet-open="solflare"]')?.href || null,
    };`,
  );

  if (
    shellPrompt.path !== "/app/send" ||
    shellPrompt.search !== "?mobile-wallet-prompt=1" ||
    !shellPrompt.hasPrompt ||
    !shellPrompt.promptText.includes("Open Vanta in your wallet") ||
    !shellPrompt.promptText.includes("Safari cannot connect Phantom directly.") ||
    !shellPrompt.phantomHref?.startsWith("https://phantom.app/ul/browse/") ||
    !shellPrompt.solflareHref?.startsWith("https://solflare.com/ul/v1/browse/")
  ) {
    throw new Error(`Safari wallet shell fallback is missing or malformed: ${JSON.stringify(shellPrompt)}`);
  }

  const clickResult = await execute(
    sessionId,
    `const trigger = document.querySelector(".app-header__account-trigger");
    if (trigger instanceof HTMLElement) {
      trigger.click();
    }
    return Boolean(trigger);`,
  );

  if (!clickResult) {
    throw new Error("Safari wallet fallback could not find the account trigger.");
  }

  await sleep(350);

  const pickerPrompt = await execute(
    sessionId,
    `return {
      shellPromptVisible: document.querySelector(".mobile-wallet-open-prompt") instanceof HTMLElement,
      hasPicker: document.querySelector(".wallet-picker") instanceof HTMLElement,
      hasPickerPrompt: document.querySelector(".wallet-picker__mobile-wallet-prompt") instanceof HTMLElement,
      pickerText: document.querySelector(".wallet-picker")?.textContent || "",
      phantomHref: document.querySelector('.wallet-picker__mobile-wallet-prompt a[data-wallet-open="phantom"]')?.href || null,
      solflareHref: document.querySelector('.wallet-picker__mobile-wallet-prompt a[data-wallet-open="solflare"]')?.href || null,
    };`,
  );

  if (
    pickerPrompt.shellPromptVisible ||
    !pickerPrompt.hasPicker ||
    !pickerPrompt.hasPickerPrompt ||
    !pickerPrompt.pickerText.includes("Safari cannot connect Phantom directly.") ||
    !pickerPrompt.phantomHref?.startsWith("https://phantom.app/ul/browse/") ||
    !pickerPrompt.solflareHref?.startsWith("https://solflare.com/ul/v1/browse/")
  ) {
    throw new Error(`Safari wallet picker fallback is missing or malformed: ${JSON.stringify(pickerPrompt)}`);
  }
}

function stopProcess(processRef) {
  if (!processRef || processRef.exitCode !== null) {
    return;
  }

  processRef.kill("SIGTERM");
}

const vite = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(vitePort), "--strictPort"], {
  env: {
    ...process.env,
    VITE_VANTA_DEPLOYMENT_MODE: "beta",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let viteStdout = "";
let viteStderr = "";
vite.stdout.on("data", (chunk) => {
  viteStdout += chunk.toString("utf8");
});
vite.stderr.on("data", (chunk) => {
  viteStderr += chunk.toString("utf8");
});

let safariDriver;
let sessionId;

try {
  execFileSync("safaridriver", ["--version"], { stdio: "ignore" });
  await waitForVite();

  safariDriver = spawn("safaridriver", ["-p", String(driverPort)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForSafariDriver(safariDriver);

  sessionId = await createSession();
  await runRouteSmoke(sessionId, "/", "Privacy rails");
  await runRouteSmoke(sessionId, "/app/send", "Send");
  await runRouteSmoke(sessionId, "/app/shield", "Shield");
  await runRouteSmoke(sessionId, "/docs", "Vanta Docs");
  await runWalletFallbackSmoke(sessionId);

  console.log("vanta Safari browser check: PASS");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  if (viteStdout || viteStderr) {
    console.error("\nVite output:");
    console.error(`${viteStdout}${viteStderr}`.trim());
  }
  process.exitCode = 1;
} finally {
  if (sessionId) {
    await webdriver("DELETE", `/session/${sessionId}`).catch(() => undefined);
  }
  stopProcess(safariDriver);
  stopProcess(vite);
}
