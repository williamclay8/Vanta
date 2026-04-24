export const VANTA_SOCIAL_VOICE = {
  version: "vanta-social-voice-v1",
  toneRules: [
    "Sound precise, calm, and founder-led.",
    "Prefer concrete control surfaces over vague crypto or AI hype.",
    "Use simple language for merchants and operators.",
    "Name limitations plainly when readiness or security is involved.",
    "Make privacy feel operational, not mystical.",
    "Keep posts short enough to review before manual posting.",
  ],
  approvedThemes: [
    "typed approvals",
    "private stablecoin settlement",
    "manual posting discipline",
    "operator evidence",
    "plain-language security limits",
    "agent-safe control surfaces",
    "merchant settlement truth",
  ],
  bannedPhrases: [
    "revolutionary",
    "moonshot",
    "fully anonymous",
    "guaranteed privacy",
    "audited",
    "production ready",
    "gm frens",
    "wagmi",
    "100x",
    "trustless magic",
    "change everything",
    "best in crypto",
  ],
  postArchetypes: [
    "control-surface thesis",
    "truth-first build note",
    "agent-permission critique",
    "merchant-operations note",
    "operator-transparency note",
  ],
  cadenceGuidance:
    "Draft in small batches, review manually, post manually, and avoid repetitive formats or automated engagement loops.",
};

export function validateVantaSocialVoiceText(text) {
  const value = String(text ?? "");
  const normalized = value.toLowerCase();
  const failures = [];

  if (value.length === 0) {
    failures.push("voice text is required");
  }

  if (value.length > 280) {
    failures.push("voice text must fit a single base X post");
  }

  for (const phrase of VANTA_SOCIAL_VOICE.bannedPhrases) {
    if (normalized.includes(phrase.toLowerCase())) {
      failures.push(`banned voice phrase: ${phrase}`);
    }
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}

export function createVantaDraftVoiceMetadata(archetype) {
  return {
    version: VANTA_SOCIAL_VOICE.version,
    archetype,
    toneRulesApplied: VANTA_SOCIAL_VOICE.toneRules.slice(0, 3),
  };
}
