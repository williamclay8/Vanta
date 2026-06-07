import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = 6200 + Math.floor(Math.random() * 500);
const baseUrl = `http://127.0.0.1:${port}`;
const browserSession = `vanta-products-check-${process.pid}-${Date.now()}`;
let viteOutput = "";

const expectedProductNames = [
  "Compliance Gateway",
  "Private Perps Engine",
  "Shielded RWA Tokenization",
  "Privacy SDK & Primitives Marketplace",
  "Private Velocity Intelligence",
];

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForVite() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (vite.exitCode !== null) {
      throw new Error(
        `Vanta dev server exited before products browser verification could start.\n${viteOutput.slice(-2000)}`,
      );
    }

    try {
      const response = await fetch(`${baseUrl}/products`);
      if (response.ok) {
        return;
      }
    } catch {
      // Vite is still booting.
    }

    await sleep(250);
  }

  throw new Error(
    `Vanta dev server did not become ready for products browser verification.\n${viteOutput.slice(-2000)}`,
  );
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
    rmSync(join(tmpdir(), "chromiumoxide-runner"), {
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

function runBrowserBatch(steps, options = {}) {
  const commandArgs = [
    "--session",
    browserSession,
    "batch",
    "--steps",
    JSON.stringify(steps),
    "--summary-only",
  ];

  try {
    execFileSync("gsd-browser", commandArgs, { stdio: options.stdio ?? "pipe" });
  } catch (error) {
    if (!options.retrying) {
      cleanupBrowserLock();
      return runBrowserBatch(steps, { ...options, retrying: true });
    }

    throw error;
  }
}

function assertSourceContracts() {
  const appSource = readFileSync("src/App.tsx", "utf8");
  const homeSource = readFileSync("src/pages/HomePage.tsx", "utf8");
  const pageSource = readFileSync("src/pages/ProductsPage.tsx", "utf8");
  const productSource = readFileSync("src/products/vantaProductSuite.ts", "utf8");
  const stylesSource = readFileSync("src/styles.css", "utf8");

  for (const snippet of [
    'path="/products"',
    'path="/products/:productSlug"',
    'to="/products"',
    "landing-minimal__product-suite",
    "products-site",
    "products-suite__grid",
    "product-detail__grid",
    "product-workbench",
    "runProductWorkbench",
  ]) {
    assert.ok(
      appSource.includes(snippet) ||
        homeSource.includes(snippet) ||
        pageSource.includes(snippet) ||
        stylesSource.includes(snippet),
      `Products website source must include ${snippet}.`,
    );
  }

  for (const name of expectedProductNames) {
    assert.ok(productSource.includes(name), `Product suite source must name ${name}.`);
  }

  const combinedSource = `${homeSource}\n${pageSource}\n${productSource}`;
  assert.equal(/\bprojects?\b/iu.test(combinedSource), false, "Product pages must not use the old umbrella label.");

  for (const bannedClaim of [
    /\bfully private\b/iu,
    /\banonymous payments?\b/iu,
    /\buntraceable\b/iu,
    /\bproduction[- ]ready\b/iu,
    /\blive mainnet-private\b/iu,
  ]) {
    assert.equal(bannedClaim.test(combinedSource), false, `Product pages include banned claim: ${bannedClaim}`);
  }
}

function runProductsBrowserProbe() {
  runBrowserBatch([
    { action: "navigate", url: `${baseUrl}/` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "selector_visible", selector: 'a[href="/products"]' },
        { kind: "text_visible", text: "Explore products" },
        { kind: "text_visible", text: "Five product surfaces now have room on the site." },
        { kind: "text_visible", text: "Compliance Gateway" },
        { kind: "text_visible", text: "Private Velocity Intelligence" },
        { kind: "text_hidden", text: "Projects" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: 'a[href="/products"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/products" },
        { kind: "text_visible", text: "Five product surfaces for counterparty-useful privacy." },
        { kind: "text_visible", text: "Named surfaces, not hidden checks." },
        { kind: "selector_visible", selector: '[data-vanta-product-card="compliance-gateway"]' },
        { kind: "selector_visible", selector: '[data-vanta-product-card="private-perps-engine"]' },
        { kind: "selector_visible", selector: '[data-vanta-product-card="shielded-rwa-tokenization"]' },
        { kind: "selector_visible", selector: '[data-vanta-product-card="privacy-sdk-primitives-marketplace"]' },
        { kind: "selector_visible", selector: '[data-vanta-product-card="private-velocity-intelligence"]' },
        { kind: "text_visible", text: "Production privacy is not enabled." },
        { kind: "text_hidden", text: "Projects" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: '[data-vanta-product-card="compliance-gateway"]' },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/products/compliance-gateway" },
        { kind: "text_visible", text: "Compliance Gateway" },
        { kind: "text_visible", text: "Selective facts such as amount threshold and jurisdiction match" },
        { kind: "text_visible", text: "npm run compliance:gateway-check" },
        { kind: "selector_visible", selector: "[data-vanta-product-workbench]" },
        { kind: "selector_visible", selector: "[data-vanta-run-product-packet]" },
        { kind: "text_visible", text: "Generate trust packet" },
        { kind: "text_visible", text: "Production privacy is not enabled." },
        { kind: "text_hidden", text: "Projects" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: "[data-vanta-run-product-packet]" },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "selector_visible", selector: "[data-vanta-product-packet-output]" },
        { kind: "text_visible", text: "Packet generated" },
        { kind: "text_visible", text: "amount >= 100000 USDC" },
        { kind: "text_visible", text: "Private witness withheld" },
        { kind: "text_visible", text: "No funds moved" },
        { kind: "text_hidden", text: "125000.00" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/products/private-perps-engine` },
    { action: "wait_for", condition: "network_idle" },
    { action: "click", selector: "[data-vanta-run-product-packet]" },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "selector_visible", selector: "[data-vanta-product-packet-output]" },
        { kind: "text_visible", text: "private_perps_public_position_packet" },
        { kind: "text_visible", text: "liquidatable" },
        { kind: "text_hidden", text: "480000" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/products/shielded-rwa-tokenization` },
    { action: "wait_for", condition: "network_idle" },
    { action: "click", selector: "[data-vanta-run-product-packet]" },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "selector_visible", selector: "[data-vanta-product-packet-output]" },
        { kind: "text_visible", text: "shielded_rwa_public_flow_packet" },
        { kind: "text_visible", text: "accreditedInvestor == true" },
        { kind: "text_hidden", text: "250000" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/products/privacy-sdk-primitives-marketplace` },
    { action: "wait_for", condition: "network_idle" },
    { action: "click", selector: "[data-vanta-run-product-packet]" },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "selector_visible", selector: "[data-vanta-product-packet-output]" },
        { kind: "text_visible", text: "primitiveCount" },
        { kind: "text_visible", text: "Velocity Commitment & Predicate" },
        { kind: "text_visible", text: "No production SDK readiness claim." },
        { kind: "no_console_errors" },
      ],
    },
    { action: "navigate", url: `${baseUrl}/products/private-velocity-intelligence` },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "url_contains", text: "/products/private-velocity-intelligence" },
        { kind: "text_visible", text: "Private Velocity Intelligence" },
        { kind: "text_visible", text: "npm run velocity-intelligence:check" },
        { kind: "text_visible", text: "No production analytics claim." },
        { kind: "selector_visible", selector: "[data-vanta-run-product-packet]" },
        { kind: "text_hidden", text: "Projects" },
        { kind: "no_console_errors" },
      ],
    },
    { action: "click", selector: "[data-vanta-run-product-packet]" },
    { action: "wait_for", condition: "network_idle" },
    {
      action: "assert",
      checks: [
        { kind: "selector_visible", selector: "[data-vanta-product-packet-output]" },
        { kind: "text_visible", text: "velocity > 300000 USD" },
        { kind: "text_visible", text: "redactedRange" },
        { kind: "text_hidden", text: "125000" },
        { kind: "no_console_errors" },
      ],
    },
  ]);
}

assertSourceContracts();

const vite = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], {
  env: { ...process.env, BROWSER: "none" },
  stdio: ["ignore", "pipe", "pipe"],
});

vite.stdout.on("data", (chunk) => {
  viteOutput += chunk.toString();
});

vite.stderr.on("data", (chunk) => {
  viteOutput += chunk.toString();
});

try {
  await waitForVite();
  runProductsBrowserProbe();
  console.log("Vanta products browser check: PASS");
} finally {
  vite.kill("SIGTERM");
  cleanupBrowserLock();
}
