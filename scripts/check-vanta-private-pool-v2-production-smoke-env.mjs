import { readFileSync } from "node:fs";

const productionServicesManifestPath = new URL("../ops/mainnet/private-pool-v2-services.manifest.json", import.meta.url);

const services = [
  {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_AUTH_TOKEN",
    id: "indexer",
    urlEnv: "VANTA_PRIVATE_POOL_V2_INDEXER_URL",
  },
  {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_PROVER_AUTH_TOKEN",
    id: "prover",
    urlEnv: "VANTA_PRIVATE_POOL_V2_PROVER_URL",
  },
  {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_AUTH_TOKEN",
    id: "relayer",
    urlEnv: "VANTA_PRIVATE_POOL_V2_RELAYER_URL",
  },
  {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_AUTH_TOKEN",
    id: "verifier",
    urlEnv: "VANTA_PRIVATE_POOL_V2_VERIFIER_URL",
  },
  {
    authTokenEnv: "VANTA_PRIVATE_POOL_V2_OPERATOR_AUTH_TOKEN",
    id: "operator",
    urlEnv: "VANTA_PRIVATE_POOL_V2_OPERATOR_URL",
  },
];

function productionServiceUrls() {
  const manifest = JSON.parse(readFileSync(productionServicesManifestPath, "utf8"));
  return new Map(
    manifest.services
      .filter((service) => service.deployedService?.environment === "production")
      .map((service) => [service.id, service.deployedService.url]),
  );
}

function readEnv(name) {
  return process.env[name]?.trim() ?? "";
}

function validateUrl(name, value) {
  if (!value) {
    return "missing";
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return "invalid-url";
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return "invalid-protocol";
  }

  if (parsed.username || parsed.password) {
    return "contains-credentials";
  }

  return "set";
}

function validateToken(value) {
  if (!value) {
    return "missing";
  }

  if (value.length < 32) {
    return "too-short";
  }

  return "set";
}

const manifestUrls = productionServiceUrls();

const results = services.map((service) => {
  const envUrlValue = readEnv(service.urlEnv);
  const manifestUrlValue = manifestUrls.get(service.id) ?? "";
  const urlValue = envUrlValue || manifestUrlValue;
  const authTokenValue = readEnv(service.authTokenEnv);

  return {
    authTokenEnv: service.authTokenEnv,
    authTokenStatus: validateToken(authTokenValue),
    id: service.id,
    urlEnv: service.urlEnv,
    urlHost: urlValue ? (() => {
      try {
        return new URL(urlValue).host;
      } catch {
        return null;
      }
    })() : null,
    urlSource: envUrlValue ? "env" : manifestUrlValue ? "production-service-manifest" : "missing",
    urlStatus: validateUrl(service.urlEnv, urlValue),
  };
});

const ok = results.every((result) => result.urlStatus === "set" && result.authTokenStatus === "set");

console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      ok,
      safety: "No auth token values, database URLs, or bearer values are printed by this check.",
      services: results,
    },
    null,
    2,
  ),
);

if (!ok) {
  process.exitCode = 1;
}
