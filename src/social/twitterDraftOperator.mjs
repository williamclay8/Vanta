import {
  VANTA_SOCIAL_VOICE,
  createVantaDraftVoiceMetadata,
  validateVantaSocialVoiceText,
} from "./vantaSocialVoice.mjs";

const DEFAULT_SOURCE_FACTS = [
  {
    id: "mission-production-readiness",
    source: "MISSION.md",
    summary:
      "Vanta's standing mission is mainnet-production readiness, but the definition of done still requires audited proof boundaries, persistent services, secure secrets, replay/nullifier protection, browser-verified UX, production docs, and truthful security limitations.",
  },
  {
    id: "agent-safe-control-plane",
    source: "Vanta Vault: vanta-agentic-commerce-privacy-suite-2026-04-23",
    summary:
      "Vanta's strongest agent-era position is a premium private stablecoin settlement control plane built around constrained delegation, typed approvals, role-scoped receipts, and explicit policy.",
  },
  {
    id: "docs-truth-first",
    source: "Vanta Vault: vanta-docs-site-implementation-2026-04-24",
    summary:
      "The public docs direction is truth-first: explain Portal, Pay, trust, security, pricing, and roadmap without implying production readiness.",
  },
  {
    id: "policy-surfaces",
    source: "Vanta Vault: ai-crypto-agent-policy-and-control-surfaces-2026-04-23",
    summary:
      "Agent-mediated crypto actions need typed approvals, narrow wallet capabilities, machine-readable operator packets, and explicit human/principal approval boundaries.",
  },
  {
    id: "security-limitations",
    source: "SECURITY_LIMITATIONS.md",
    summary:
      "Vanta social language must avoid audit, custody, anonymity-set, and production-readiness claims unless the source truth explicitly supports them.",
  },
  {
    id: "social-draft-only-boundary",
    source: "Vanta Vault: vanta-social-twitter-draft-operator-2026-04-24",
    summary:
      "The official-account operator starts as draft-only and manual-posting-only, with no X credentials, no Composio write path, and no automated account actions.",
  },
];

const DEFAULT_MANUAL_CHECKLIST = [
  "Confirm the source facts still match the current repo and vault state.",
  "Verify the post does not imply audit, custody, production-readiness, or anonymity guarantees.",
  "Post manually from the official X account only after human review.",
  "Do not convert this draft into an automated reply, like, follow, repost, or DM.",
];

const BLOCKED_CLAIM_NOTES = [
  "No mainnet-production-ready claim.",
  "No audit, certification, or third-party-review claim.",
  "No custody, fund-safety, or anonymity guarantee.",
  "No token price, investment, partnership, or customer claim without a source.",
];

const BLOCKED_PATTERNS = [
  {
    label: "production readiness",
    regex: /\b(production ready|production-ready|mainnet ready|mainnet-ready|ready for mainnet)\b/iu,
  },
  {
    label: "audit",
    regex: /\b(audited|certified|third[-\s]?party reviewed|security approved)\b/iu,
  },
  {
    label: "custody",
    regex: /\b(custody|custodial|funds are safe|safe funds|insured)\b/iu,
  },
  {
    label: "guarantee",
    regex: /\b(guarantee|guaranteed|anonymous|anonymity guaranteed|untraceable)\b/iu,
  },
  {
    label: "investment advice",
    regex: /\b(buy \$?vanta|price will|number go up|financial advice|investment advice)\b/iu,
  },
  {
    label: "automated account action",
    regex: /\b(auto[-\s]?reply|automated reply|auto[-\s]?like|auto[-\s]?follow|auto[-\s]?post)\b/iu,
  },
];

const DEFAULT_DRAFT_BLUEPRINTS = [
  {
    id: "control-plane",
    angle: "Position Vanta around control surfaces, not generic AI-wallet hype.",
    archetype: "control-surface thesis",
    factIds: ["agent-safe-control-plane", "policy-surfaces"],
    text:
      "Vanta's bet: private stablecoin settlement needs clear control surfaces. Typed approvals, scoped receipts, and human-readable policy matter more than vague agent autonomy.",
  },
  {
    id: "truth-first",
    angle: "Make the security posture legible without overclaiming readiness.",
    archetype: "truth-first build note",
    factIds: ["mission-production-readiness", "docs-truth-first"],
    text:
      "We are building Vanta in public with a simple rule: do not blur demos with readiness. Private settlement needs proof boundaries, operator evidence, and plain-language limitations.",
  },
  {
    id: "agent-safe",
    angle: "Explain why agent-mediated commerce needs narrower permissions.",
    archetype: "agent-permission critique",
    factIds: ["agent-safe-control-plane", "policy-surfaces"],
    text:
      "The agent economy does not need broader wallet access. It needs narrower authority: explicit approval packets, clear receipts, and settlement flows that fail closed.",
  },
  {
    id: "merchant-pay",
    angle: "Tie Vanta Pay to private settlement operations.",
    archetype: "merchant-operations note",
    factIds: ["docs-truth-first", "agent-safe-control-plane"],
    text:
      "For merchants, private payment UX is only half the product. The real work is settlement truth: what was approved, what moved, what can be reconciled, and what stays private.",
  },
  {
    id: "social-discipline",
    angle: "Make the official-account workflow transparent.",
    archetype: "operator-transparency note",
    factIds: ["social-draft-only-boundary", "security-limitations"],
    text:
      "Vanta social output starts with source-backed drafts, not account automation. The point is simple: get the voice right before adding write-capable tools.",
  },
];

function selectFacts(factIds, sourceFacts) {
  const factsById = new Map(sourceFacts.map((fact) => [fact.id, fact]));
  return factIds.map((id) => factsById.get(id)).filter(Boolean);
}

function createDraftFromBlueprint(blueprint, index, sourceFacts) {
  return {
    id: `vanta-twitter-draft-${index + 1}-${blueprint.id}`,
    angle: blueprint.angle,
    text: blueprint.text,
    sourceFacts: selectFacts(blueprint.factIds, sourceFacts),
    rationale: `Use this when Vanta wants to describe ${blueprint.angle.toLowerCase()}`,
    blockedClaimsAvoided: [...BLOCKED_CLAIM_NOTES],
    manualChecklist: [...DEFAULT_MANUAL_CHECKLIST],
    manualPostingOnly: true,
    voice: createVantaDraftVoiceMetadata(blueprint.archetype),
  };
}

export function validateVantaTwitterDraft(draft) {
  const failures = [];

  if (!draft || typeof draft !== "object") {
    return {
      ok: false,
      failures: ["draft must be an object"],
    };
  }

  if (draft.manualPostingOnly !== true) {
    failures.push("draft must be marked manual-posting-only");
  }

  if (!Array.isArray(draft.sourceFacts) || draft.sourceFacts.length === 0) {
    failures.push("draft must include at least one source fact");
  }

  if (!Array.isArray(draft.manualChecklist) || draft.manualChecklist.length < 3) {
    failures.push("draft must include a manual posting checklist");
  }

  const text = String(draft.text ?? "");
  if (text.length === 0) {
    failures.push("draft text is required");
  }

  if (text.length > 280) {
    failures.push("draft text must fit a single base X post");
  }

  for (const blockedPattern of BLOCKED_PATTERNS) {
    if (blockedPattern.regex.test(text)) {
      failures.push(`blocked ${blockedPattern.label} claim`);
    }
  }

  const voiceValidation = validateVantaSocialVoiceText(text);
  failures.push(...voiceValidation.failures);

  return {
    ok: failures.length === 0,
    failures,
  };
}

export function createVantaTwitterDraftPacket(options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const sourceFacts = options.socialContext?.sourceFacts ?? options.sourceFacts ?? DEFAULT_SOURCE_FACTS;
  const blueprints = options.blueprints ?? DEFAULT_DRAFT_BLUEPRINTS;
  const drafts = blueprints.map((blueprint, index) => createDraftFromBlueprint(blueprint, index, sourceFacts));
  const validation = drafts.map((draft) => ({
    draftId: draft.id,
    ...validateVantaTwitterDraft(draft),
  }));

  return {
    generatedAt,
    mode: "draft-only",
    operator: "vanta-social-twitter-draft-operator-v0",
    platform: "x-twitter",
    contextKind: options.socialContext?.kind ?? "static-default-source-facts",
    contextSourceCount: sourceFacts.length,
    voiceVersion: VANTA_SOCIAL_VOICE.version,
    voiceGuidance: {
      toneRules: VANTA_SOCIAL_VOICE.toneRules,
      approvedThemes: VANTA_SOCIAL_VOICE.approvedThemes,
      bannedPhrases: VANTA_SOCIAL_VOICE.bannedPhrases,
      cadenceGuidance: VANTA_SOCIAL_VOICE.cadenceGuidance,
    },
    writeCapabilities: [],
    readCapabilities: ["repo-context", "vault-context"],
    manualPostingOnly: true,
    policy: {
      blockedPatterns: BLOCKED_PATTERNS.map((pattern) => pattern.label),
      note: "Draft-only v0 has no X, Twitter, or Composio write path.",
    },
    drafts,
    validation,
  };
}

function formatSourceFact(fact) {
  return `  - ${fact.summary} (${fact.source})`;
}

export function formatVantaTwitterDraftMarkdown(packet) {
  const lines = [
    "# Vanta Twitter Drafts",
    "",
    `Generated: ${packet.generatedAt}`,
    "",
    "Manual posting only. This artifact is a draft queue, not an automation command.",
    "",
    `Mode: ${packet.mode}`,
    `Write capabilities: ${packet.writeCapabilities.length === 0 ? "none" : packet.writeCapabilities.join(", ")}`,
    "",
  ];

  packet.drafts.forEach((draft, index) => {
    lines.push(`## Draft ${index + 1}: ${draft.angle}`);
    lines.push("");
    lines.push(`Voice: ${draft.voice.archetype} (${draft.voice.version})`);
    lines.push("");
    lines.push(draft.text);
    lines.push("");
    lines.push("Source facts:");
    lines.push(...draft.sourceFacts.map(formatSourceFact));
    lines.push("");
    lines.push(`Rationale: ${draft.rationale}`);
    lines.push("");
    lines.push("Blocked claims avoided:");
    lines.push(...draft.blockedClaimsAvoided.map((claim) => `  - ${claim}`));
    lines.push("");
    lines.push("Manual checklist:");
    lines.push(...draft.manualChecklist.map((item) => `  - ${item}`));
    lines.push("");
  });

  return `${lines.join("\n").trim()}\n`;
}
