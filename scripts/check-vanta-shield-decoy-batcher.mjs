import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
mkdirSync(join(repoRoot, ".tmp"), { recursive: true });
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-shield-decoy-batcher-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");
const sourceFiles = ["privacy/shieldDecoyBatcher.ts"];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function copySource(relativePath) {
  mkdirSync(join(tempTsDir, relativePath, ".."), { recursive: true });
  writeFileSync(
    join(tempTsDir, relativePath),
    readFileSync(resolve(repoRoot, "src", relativePath), "utf8"),
  );
}

function patchRelativeImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8")
    .replace(/from "((?:\.\.?\/)[^"]+)\.ts"/g, 'from "$1.js"')
    .replace(/from "((?:\.\.?\/)[^"]+)(?<!\.js)"/g, 'from "$1.js"');
  writeFileSync(filePath, source);
}

try {
  mkdirSync(tempTsDir, { recursive: true });
  for (const file of sourceFiles) {
    copySource(file);
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((file) => join(tempTsDir, file)),
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--lib",
      "ES2022,DOM",
      "--skipLibCheck",
      "--rootDir",
      tempTsDir,
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  for (const file of sourceFiles) {
    patchRelativeImports(file);
  }

  // --- Stub global crypto.getRandomValues only if missing (Node >=18 has it). ---
  if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.getRandomValues !== "function") {
    const { webcrypto } = await import("node:crypto");
    if (typeof globalThis.crypto === "undefined") {
      Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
    } else {
      globalThis.crypto.getRandomValues = webcrypto.getRandomValues.bind(webcrypto);
    }
  }

  // --- Stub global fetch with a recording counter. ---
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    fetchCalls.push({
      url: typeof url === "string" ? url : String(url),
      method: init?.method,
      body: init?.body,
      headers: init?.headers,
    });
    return {
      ok: true,
      status: 204,
      async json() {
        return {};
      },
      async text() {
        return "";
      },
    };
  };

  const {
    generateDecoyCommitment,
    runShieldWithDecoys,
    uniformRandomInt,
  } = await import(pathToFileURL(join(tempJsDir, "privacy/shieldDecoyBatcher.js")).href);

  // (a) generateDecoyCommitment shape.
  const sample = generateDecoyCommitment();
  assert(typeof sample === "string", "Expected commitment to be a string.");
  assert(/^0x[0-9a-f]{64}$/.test(sample), `Expected 0x + 64 lowercase hex chars, got ${sample}`);
  // Two consecutive calls should not collide (probabilistically certain).
  assert(generateDecoyCommitment() !== sample, "Expected commitments to be random.");

  // uniformRandomInt sanity.
  for (let i = 0; i < 50; i += 1) {
    const v = uniformRandomInt(2, 6);
    assert(Number.isInteger(v) && v >= 2 && v <= 6, `uniformRandomInt out of range: ${v}`);
  }
  assert(uniformRandomInt(7, 7) === 7, "uniformRandomInt(7,7) must be 7.");

  // (b) + (c) + (d): explicit decoyCount of 4.
  fetchCalls.length = 0;
  let realCalls = 0;
  const happyStart = Date.now();
  const happy = await runShieldWithDecoys(
    async () => {
      realCalls += 1;
      return "ok";
    },
    { decoyCount: 4, jitterMinMs: 5, jitterMaxMs: 10, baseUrl: "https://example.invalid" },
  );
  const happyElapsed = Date.now() - happyStart;
  assert(happy === "ok", `Expected real result "ok", got ${JSON.stringify(happy)}`);
  assert(realCalls === 1, `Expected real callback to fire exactly once, got ${realCalls}`);
  assert(
    fetchCalls.length === 4,
    `Expected exactly 4 decoy fetches when decoyCount=4, got ${fetchCalls.length}`,
  );
  for (const call of fetchCalls) {
    assert(
      call.url === "https://example.invalid/private-pool-v2/decoy-commitments",
      `Unexpected decoy URL: ${call.url}`,
    );
    assert(call.method === "POST", `Expected POST, got ${call.method}`);
    const parsed = JSON.parse(call.body);
    assert(
      typeof parsed.commitment === "string" && /^0x[0-9a-f]{64}$/.test(parsed.commitment),
      `Expected hex commitment in body, got ${call.body}`,
    );
    assert(call.headers["Content-Type"] === "application/json", "Expected JSON content-type.");
  }

  // (f) wall-clock elapsed >= jitterMinMs.
  assert(
    happyElapsed >= 5,
    `Expected at least 5ms elapsed for jitterMinMs=5, got ${happyElapsed}`,
  );

  // Default decoy count branch: should be in [2, 6].
  fetchCalls.length = 0;
  await runShieldWithDecoys(async () => 42, { jitterMinMs: 1, jitterMaxMs: 2 });
  assert(
    fetchCalls.length >= 2 && fetchCalls.length <= 6,
    `Expected default decoy count in [2,6], got ${fetchCalls.length}`,
  );

  // Null baseUrl -> path-relative URL.
  fetchCalls.length = 0;
  await runShieldWithDecoys(async () => null, {
    decoyCount: 2,
    baseUrl: null,
    jitterMinMs: 1,
    jitterMaxMs: 2,
  });
  assert(fetchCalls.length === 2, `Expected 2 decoys for null baseUrl, got ${fetchCalls.length}`);
  for (const call of fetchCalls) {
    assert(
      call.url === "/private-pool-v2/decoy-commitments",
      `Expected path-relative URL when baseUrl is null, got ${call.url}`,
    );
  }

  // authToken propagation.
  fetchCalls.length = 0;
  await runShieldWithDecoys(async () => "ok", {
    decoyCount: 1,
    baseUrl: "https://example.invalid/",
    authToken: "tok-123",
    jitterMinMs: 1,
    jitterMaxMs: 2,
  });
  assert(fetchCalls.length === 1, "Expected 1 decoy with authToken.");
  assert(
    fetchCalls[0].url === "https://example.invalid/private-pool-v2/decoy-commitments",
    `Trailing slash should be normalized, got ${fetchCalls[0].url}`,
  );
  assert(
    fetchCalls[0].headers.Authorization === "Bearer tok-123",
    `Expected Bearer header, got ${JSON.stringify(fetchCalls[0].headers)}`,
  );

  // (e) real callback throws -> rejection bubbles, decoys still fired.
  fetchCalls.length = 0;
  let threw = false;
  try {
    await runShieldWithDecoys(
      async () => {
        throw new Error("real-failed");
      },
      { decoyCount: 3, jitterMinMs: 1, jitterMaxMs: 2 },
    );
  } catch (error) {
    threw = true;
    assert(
      error instanceof Error && error.message === "real-failed",
      `Expected original error to bubble, got ${error}`,
    );
  }
  assert(threw, "Expected runShieldWithDecoys to reject when the real request throws.");
  assert(
    fetchCalls.length === 3,
    `Expected decoys to still fire on real-rejection, got ${fetchCalls.length}`,
  );

  // Decoys swallow network errors but the real request still surfaces.
  globalThis.fetch = async () => {
    throw new Error("decoy-network-down");
  };
  const survived = await runShieldWithDecoys(async () => "still-ok", {
    decoyCount: 2,
    jitterMinMs: 1,
    jitterMaxMs: 2,
  });
  assert(survived === "still-ok", `Decoy errors must not affect real result, got ${survived}`);

  // Restore fetch (best effort; process exits after this anyway).
  globalThis.fetch = originalFetch;

  console.log("vanta Shield decoy batcher: PASS");
} catch (error) {
  const stdout = String(error.stdout ?? "");
  const stderr = String(error.stderr ?? "");
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
