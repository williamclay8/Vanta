import { execFileSync, spawn } from "node:child_process";

const port = 5260 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;

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

function runBrowserCommand(args, options = {}) {
  const output = execFileSync("gsd-browser", args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });

  return typeof output === "string" ? output.trim() : "";
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
        hasAppCta: [...document.querySelectorAll("a")].some((link) => link.textContent?.trim() === "Enter App" && link.getAttribute("href") === "/app/send"),
        hasTruthCopy: document.body.innerText.includes("Fund-moving production actions stay disabled"),
        hasPointedActions: ["shield", "send", "swap", "strategy", "unshield", "pay"].every((label) => document.body.innerText.toLowerCase().includes(label)),
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

  if (!result.headline.includes("Privacy rails")) {
    throw new Error(`Landing headline missing: ${result.headline}`);
  }

  if (!result.hasAppCta) {
    throw new Error("Landing page must include an Enter App CTA to /app/send.");
  }

  if (!result.hasTruthCopy) {
    throw new Error("Landing page must include beta truth copy.");
  }

  if (!result.hasPointedActions) {
    throw new Error("Landing page must point users to the app actions.");
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
