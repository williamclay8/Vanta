import { readFileSync } from "node:fs";

const manifestPath = new URL("../ops/mainnet/private-pool-v2-services.manifest.json", import.meta.url);
const requireAuth = process.argv.includes("--require-auth");
const checkPublic = process.argv.includes("--check-public") || requireAuth;
const authShellCommand =
  "doppler run --config prd --project vanta -- node scripts/print-vanta-production-private-rail-route-health.mjs --require-auth";

const roleConfig = {
  indexer: {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN",
    publicHealthPath: "/health",
    readinessPath: "/v1/roots/latest?treeId=vanta-production-smoke-tree",
    urlEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_URL",
  },
  operator: {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
    publicHealthPath: "/health",
    readinessPath: "/state/private-pool-v2-status",
    urlEnv: "VANTA_PRIVATE_POOL_V2_OPERATOR_URL",
  },
  prover: {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN",
    publicHealthPath: "/health",
    readinessPath: "/v1/proofs/health",
    urlEnv: "VANTA_PRIVATE_POOL_V2_PROVER_URL",
  },
  relayer: {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN",
    publicHealthPath: "/health",
    readinessPath: "/v1/claims/quote",
    urlEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_URL",
  },
  verifier: {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN",
    publicHealthPath: "/health",
    readinessPath: "/v1/proofs/accept",
    urlEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_URL",
  },
};

function readManifest() {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function envValue(name) {
  return process.env[name]?.trim() ?? "";
}

function manifestServiceUrl(service) {
  return service.deployedService?.environment === "production" ? service.deployedService.url : "";
}

function resolveUrl(service, config) {
  const envUrl = envValue(config.urlEnv);
  const manifestUrl = manifestServiceUrl(service);
  const value = envUrl || manifestUrl;

  if (!value) {
    return {
      host: null,
      source: "missing",
      status: "missing",
      value: "",
    };
  }

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return {
        host: null,
        source: envUrl ? "env" : "manifest",
        status: "invalid-protocol",
        value,
      };
    }
    if (parsed.username || parsed.password) {
      return {
        host: parsed.host,
        source: envUrl ? "env" : "manifest",
        status: "contains-credentials",
        value,
      };
    }
    return {
      host: parsed.host,
      source: envUrl ? "env" : "manifest",
      status: "set",
      value: value.replace(/\/+$/, ""),
    };
  } catch {
    return {
      host: null,
      source: envUrl ? "env" : "manifest",
      status: "invalid-url",
      value,
    };
  }
}

function endpoint(baseUrl, path) {
  return new URL(path, `${baseUrl}/`).toString();
}

async function probeJson({ baseUrl, path, token }) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const response = await fetch(endpoint(baseUrl, path), { headers });
    let parsed = null;
    const text = await response.text();
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }
    return {
      ok: response.ok,
      responseOkField: parsed?.ok === true ? true : parsed?.ok === false ? false : null,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.name : "unknown-error",
      ok: false,
      responseOkField: null,
      status: 0,
    };
  }
}

async function run() {
  const manifest = readManifest();
  const services = [];

  for (const service of manifest.services) {
    const config = roleConfig[service.id];
    if (!config) {
      continue;
    }

    const resolvedUrl = resolveUrl(service, config);
    const token = envValue(config.authTokenEnv);
    const health =
      resolvedUrl.status === "set"
        ? await probeJson({ baseUrl: resolvedUrl.value, path: config.publicHealthPath })
        : { ok: false, responseOkField: null, status: 0 };
    const readiness =
      resolvedUrl.status === "set" && token
        ? await probeJson({ baseUrl: resolvedUrl.value, path: config.readinessPath, token })
        : {
            ok: false,
            reason: token ? "missing-url" : "missing-auth-token",
            responseOkField: null,
            skipped: true,
            status: 0,
          };

    services.push({
      authTokenEnv: config.authTokenEnv,
      authTokenStatus: token ? "set" : "missing",
      health,
      id: service.id,
      readiness,
      urlEnv: config.urlEnv,
      urlHost: resolvedUrl.host,
      urlSource: resolvedUrl.source,
      urlStatus: resolvedUrl.status,
    });
  }

  const publicHealthOk = services.every((service) => service.urlStatus === "set" && service.health.ok);
  const authenticatedReadinessOk = services.every(
    (service) => service.authTokenStatus === "set" && service.readiness.ok,
  );
  const missingAuthTokenEnvs = services
    .filter((service) => service.authTokenStatus !== "set")
    .map((service) => service.authTokenEnv);
  const ok = checkPublic ? publicHealthOk && (!requireAuth || authenticatedReadinessOk) : true;

  console.log(
    JSON.stringify(
      {
        authenticatedReadinessCommand: authShellCommand,
        authenticatedReadinessOk,
        checkedAt: new Date().toISOString(),
        checkMode: requireAuth ? "require-auth" : checkPublic ? "check-public" : "status-only",
        mainnetReady: false,
        missingAuthTokenEnvs,
        nextAction:
          missingAuthTokenEnvs.length > 0
            ? `Load the production role auth tokens in a secret-manager shell and rerun: ${authShellCommand}`
            : requireAuth
              ? "Authenticated readiness was attempted."
              : "Run the authenticated route-health command from a secret-manager shell when you want readiness validation.",
        ok,
        productionReady: false,
        publicHealthOk,
        safety: "No auth token values, database URLs, bearer values, wallet keys, or signed transaction material are printed.",
        services,
        version: "vanta-production-private-rail-route-health-0.1",
      },
      null,
      2,
    ),
  );

  if (!ok) {
    process.exitCode = 1;
  }
}

await run();
