import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const vaultRoot = "/Users/clay/Desktop/Vanta Vault";

const SAFE_SOURCES = [
  {
    id: "mission-mainnet-production",
    path: "MISSION.md",
    fact:
      "Vanta is not production-ready until real mainnet-compatible private settlement, audited proof/circuit boundaries, persistent services, secure secrets, replay/nullifier protection, browser-verified UX, production deployment docs, and truthful security limitations are complete.",
    requiredPattern: /not production-ready|not production ready|not production/i,
  },
  {
    id: "security-limitations",
    path: "SECURITY_LIMITATIONS.md",
    fact:
      "Vanta's public language must preserve the security-limitations truth: no audit claim, no custody claim, no anonymity-set claim, and no implication that demos equal production readiness.",
    requiredPattern: /No audit claim|No custody claim|No anonymity-set claim/i,
  },
  {
    id: "docs-truth-first",
    path: "docs/superpowers/specs/2026-04-24-vanta-social-twitter-draft-operator-design.md",
    fact:
      "The official-account social operator starts as draft-only and manual-posting-only, with no X credentials, no Composio write path, and no automated account actions.",
    requiredPattern: /draft-only|manual posting|no X credentials|no Composio/i,
  },
  {
    id: "agent-safe-control-plane",
    path: "../Vanta Vault/wiki/analyses/vanta-agentic-commerce-privacy-suite-2026-04-23.md",
    fact:
      "Vanta's agent-era position is a premium private stablecoin settlement control plane built around constrained delegation, typed approvals, role-scoped receipts, and explicit policy.",
    requiredPattern: /typed approvals|role-scoped receipts|explicit policy/i,
  },
  {
    id: "agent-policy-surfaces",
    path: "../Vanta Vault/wiki/analyses/ai-crypto-agent-policy-and-control-surfaces-2026-04-23.md",
    fact:
      "Agent-mediated crypto actions need typed approvals, narrow wallet capabilities, machine-readable operator packets, and explicit human or principal approval boundaries.",
    requiredPattern: /typed approvals|operator packets|principal/i,
  },
  {
    id: "social-draft-only-boundary",
    path: "../Vanta Vault/wiki/analyses/vanta-social-twitter-draft-operator-2026-04-24.md",
    fact:
      "The social operator v0 is manual-posting-only and draft-only; Composio should only be introduced after the voice and policy loop are trusted.",
    requiredPattern: /manual-posting-only|draft-only|Composio/i,
  },
];

const EXCLUDED_PATHS = [".env", ".env.local", ".tmp", "node_modules"];

function resolveSafePath(sourcePath) {
  if (sourcePath.startsWith("../Vanta Vault/")) {
    return resolve(vaultRoot, sourcePath.replace("../Vanta Vault/", ""));
  }

  return resolve(repoRoot, sourcePath);
}

function readSafeSource(source) {
  const absolutePath = resolveSafePath(source.path);

  if (!existsSync(absolutePath)) {
    return {
      ...source,
      available: false,
      source: source.path,
      summary: `${source.fact} Source file is currently unavailable at ${source.path}.`,
    };
  }

  const text = readFileSync(absolutePath, "utf8");
  const matchesRequiredPattern = source.requiredPattern.test(text);

  return {
    id: source.id,
    available: true,
    source: source.path,
    summary: matchesRequiredPattern
      ? source.fact
      : `${source.fact} The source was loaded, but the exact expected phrase should be rechecked before posting.`,
  };
}

export function loadVantaSocialContext(options = {}) {
  const loadedAt = options.loadedAt ?? new Date().toISOString();
  const sourceFacts = SAFE_SOURCES.map(readSafeSource);

  return {
    kind: "vanta-social-context-v1",
    loadedAt,
    safeSourcePaths: SAFE_SOURCES.map((source) => source.path),
    excludedPaths: [...EXCLUDED_PATHS],
    sourceFacts,
  };
}
