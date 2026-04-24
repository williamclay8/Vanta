import { strict as assert } from "node:assert";
import {
  VANTA_SOCIAL_VOICE,
  validateVantaSocialVoiceText,
} from "../src/social/vantaSocialVoice.mjs";
import { createVantaTwitterDraftPacket } from "../src/social/twitterDraftOperator.mjs";

assert.equal(VANTA_SOCIAL_VOICE.version, "vanta-social-voice-v1", "voice contract must be versioned");
assert.ok(VANTA_SOCIAL_VOICE.toneRules.length >= 5, "voice contract should include enough tone rules");
assert.ok(VANTA_SOCIAL_VOICE.approvedThemes.length >= 5, "voice contract should include approved themes");
assert.ok(VANTA_SOCIAL_VOICE.bannedPhrases.length >= 8, "voice contract should include banned phrases");
assert.ok(VANTA_SOCIAL_VOICE.postArchetypes.length >= 4, "voice contract should include varied post archetypes");
assert.ok(VANTA_SOCIAL_VOICE.cadenceGuidance.includes("manual"), "cadence guidance must preserve manual posting");

const safeVoice = validateVantaSocialVoiceText(
  "Private stablecoin settlement needs typed approvals, clear receipts, and plain-language limits.",
);
assert.equal(safeVoice.ok, true, "grounded Vanta voice should pass");

const unsafeVoice = validateVantaSocialVoiceText(
  "Vanta is the revolutionary fully anonymous audited moonshot that will change everything.",
);
assert.equal(unsafeVoice.ok, false, "generic hype and unsafe claims should fail voice validation");
assert.ok(
  unsafeVoice.failures.some((failure) => failure.includes("revolutionary")),
  "voice validation should name banned hype language",
);
assert.ok(
  unsafeVoice.failures.some((failure) => failure.includes("fully anonymous")),
  "voice validation should name banned anonymity language",
);

const packet = createVantaTwitterDraftPacket({
  generatedAt: "2026-04-24T13:00:00.000Z",
});

assert.equal(packet.voiceVersion, "vanta-social-voice-v1", "draft packet must record the voice contract version");
assert.ok(packet.voiceGuidance.toneRules.length >= 5, "draft packet should include tone guidance");

const archetypes = new Set(packet.drafts.map((draft) => draft.voice.archetype));
assert.ok(archetypes.size >= 4, "drafts should span multiple voice archetypes");

for (const draft of packet.drafts) {
  assert.equal(draft.voice.version, "vanta-social-voice-v1", "drafts must carry voice contract version");
  assert.ok(draft.voice.archetype, "drafts must name a voice archetype");
  assert.ok(draft.voice.toneRulesApplied.length >= 2, "drafts must record applied tone rules");

  const validation = validateVantaSocialVoiceText(draft.text);
  assert.equal(validation.ok, true, `draft text should pass voice validation: ${draft.id}`);
}

console.log("Vanta social voice check: PASS");
