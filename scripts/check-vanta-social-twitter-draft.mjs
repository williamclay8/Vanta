import { strict as assert } from "node:assert";
import {
  createVantaTwitterDraftPacket,
  formatVantaTwitterDraftMarkdown,
  validateVantaTwitterDraft,
} from "../src/social/twitterDraftOperator.mjs";

const packet = createVantaTwitterDraftPacket({
  generatedAt: "2026-04-24T12:00:00.000Z",
});

assert.equal(packet.mode, "draft-only", "social operator must stay draft-only in v0");
assert.deepEqual(packet.writeCapabilities, [], "v0 must expose no write-capable social tools");
assert.ok(packet.drafts.length >= 3, "operator should produce at least three candidate drafts");

for (const draft of packet.drafts) {
  assert.equal(draft.manualPostingOnly, true, "drafts must require manual posting");
  assert.ok(draft.text.length > 40, "draft text should be substantial enough to review");
  assert.ok(draft.text.length <= 280, "single-post drafts must fit X's base post length");
  assert.ok(draft.sourceFacts.length > 0, "drafts must include source facts");
  assert.ok(draft.rationale.length > 0, "drafts must include rationale");
  assert.ok(draft.blockedClaimsAvoided.length > 0, "drafts must name blocked claim classes avoided");
  assert.ok(draft.manualChecklist.length >= 3, "drafts must include a useful manual checklist");

  const validation = validateVantaTwitterDraft(draft);
  assert.equal(validation.ok, true, `safe draft should pass policy validation: ${draft.id}`);
}

const unsafeDraft = {
  ...packet.drafts[0],
  text: "Vanta is audited, production ready, and guarantees anonymous mainnet settlement.",
};
const unsafeValidation = validateVantaTwitterDraft(unsafeDraft);

assert.equal(unsafeValidation.ok, false, "unsafe readiness and security claims must be blocked");
assert.ok(
  unsafeValidation.failures.some((failure) => failure.includes("production readiness")),
  "unsafe validation should name production readiness risk",
);
assert.ok(
  unsafeValidation.failures.some((failure) => failure.includes("audit")),
  "unsafe validation should name audit-claim risk",
);
assert.ok(
  unsafeValidation.failures.some((failure) => failure.includes("guarantee")),
  "unsafe validation should name guarantee risk",
);

const markdown = formatVantaTwitterDraftMarkdown(packet);
assert.ok(markdown.includes("# Vanta Twitter Drafts"), "Markdown artifact should have a title");
assert.ok(markdown.includes("Manual posting only"), "Markdown artifact should preserve manual-posting warning");
assert.ok(!markdown.includes("COMPOSIO_API_KEY"), "Markdown artifact must not mention raw credential names");

console.log("Vanta social Twitter draft check: PASS");
