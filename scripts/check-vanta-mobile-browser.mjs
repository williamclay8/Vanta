import { execFileSync, spawn } from "node:child_process";

const port = 5020 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;

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
  const output = execFileSync("gsd-browser", args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });

  return typeof output === "string" ? output.trim() : "";
}

function runMobileRouteProbe(path) {
  runBrowserCommand(["navigate", `${baseUrl}${path}`], { stdio: "ignore" });
  runBrowserCommand(["wait-for", "--condition", "network_idle"], { stdio: "ignore" });

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
      bodyWidth: body.scrollWidth,
      horizontalOverflow: Math.max(documentElement.scrollWidth, body.scrollWidth) - window.innerWidth,
      actionVisible: Boolean(document.querySelector(".button-primary, .strategy-primary-action")),
      tooSmall,
    };
  })()`;
  const result = JSON.parse(runBrowserCommand(["eval", probe]));

  if (result.horizontalOverflow > 2) {
    throw new Error(
      `Mobile overflow on ${path}: viewport=${result.viewportWidth}, document=${result.documentWidth}, overflow=${result.horizontalOverflow}`,
    );
  }

  if (!result.actionVisible) {
    throw new Error(`No primary action visible on mobile route ${path}.`);
  }

  if (result.tooSmall.length > 0) {
    throw new Error(`Small mobile hit targets on ${path}: ${JSON.stringify(result.tooSmall.slice(0, 8))}`);
  }
}

function runWalletMenuProbe() {
  runBrowserCommand(["navigate", `${baseUrl}/app/shield`], { stdio: "ignore" });
  runBrowserCommand(["wait-for", "--condition", "network_idle"], { stdio: "ignore" });
  runBrowserCommand(["click", ".app-header__account-trigger"], { stdio: "ignore" });
  runBrowserCommand(["wait-for", "--condition", "text_visible", "--value", "Fresh wallet"], { stdio: "ignore" });

  const probe = `(async () => {
    const picker = document.querySelector(".wallet-picker");
    const fresh = [...document.querySelectorAll(".wallet-picker__section-label")]
      .find((element) => element.textContent?.includes("Fresh wallet"));
    if (!picker || !fresh) {
      return { ok: false, reason: "missing wallet picker or fresh wallet section" };
    }

    const pickerRect = picker.getBoundingClientRect();
    fresh.scrollIntoView({ block: "nearest" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const freshRect = fresh.getBoundingClientRect();
    return {
      ok: true,
      pickerBottom: Math.round(pickerRect.bottom),
      viewportBottom: window.innerHeight,
      pickerScrollable: picker.scrollHeight > picker.clientHeight,
      freshVisibleAfterScroll: freshRect.top >= 0 && freshRect.bottom <= window.innerHeight,
      horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    };
  })()`;
  const result = JSON.parse(runBrowserCommand(["eval", probe]));

  if (!result.ok) {
    throw new Error(result.reason);
  }

  if (result.pickerBottom > result.viewportBottom + 2) {
    throw new Error(`Wallet picker exceeds mobile viewport: ${JSON.stringify(result)}`);
  }

  if (!result.freshVisibleAfterScroll) {
    throw new Error(`Fresh wallet section is not reachable in mobile wallet menu: ${JSON.stringify(result)}`);
  }

  if (result.horizontalOverflow > 2) {
    throw new Error(`Wallet menu causes mobile horizontal overflow: ${JSON.stringify(result)}`);
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
  await waitForVite();
  runBrowserCommand(["set-viewport", "--width", "390", "--height", "844"], { stdio: "ignore" });

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
    execFileSync("gsd-browser", ["daemon", "stop"], { stdio: "ignore" });
  } catch {
    // The daemon may already be stopped.
  }
}
