import { strict as assert } from "node:assert";
import { loadVantaSocialContext } from "../src/social/vantaSocialContext.mjs";
import { createVantaTwitterDraftPacket } from "../src/social/twitterDraftOperator.mjs";

const context = loadVantaSocialContext();

assert.equal(context.kind, "vanta-social-context-v1", "context packet must use the v1 contract");
assert.ok(context.loadedAt, "context packet must include a load timestamp");
assert.ok(context.sourceFacts.length >= 4, "context loader should collect multiple source facts");
assert.ok(context.safeSourcePaths.length >= 4, "context loader should report safe source paths");
assert.deepEqual(context.excludedPaths, [".env", ".env.local", ".tmp", "node_modules"], "unsafe paths must stay excluded");

assert.ok(
  context.sourceFacts.some((fact) => /not production-ready|not production ready/i.test(fact.summary)),
  "context must preserve the not-production-ready truth",
);
assert.ok(
  context.sourceFacts.some((fact) => /manual-posting-only|draft-only/i.test(fact.summary)),
  "context must preserve the draft-only social operator truth",
);
assert.ok(
  context.sourceFacts.some((fact) => /typed approvals|operator packets|control surfaces/i.test(fact.summary)),
  "context must preserve Vanta's agent-safe control-surface framing",
);

for (const fact of context.sourceFacts) {
  assert.ok(fact.id, "every source fact must have an id");
  assert.ok(fact.source, "every source fact must name its source");
  assert.ok(fact.summary.length > 40, "every source fact must contain a useful summary");
  assert.ok(!fact.source.includes(".env"), "source facts must never come from env files");
  assert.ok(!fact.source.includes(".tmp"), "source facts must never come from ignored draft artifacts");
  assert.ok(!/COMPOSIO_API_KEY|OPENAI_API_KEY|ak_[A-Za-z0-9_-]{10,}/u.test(fact.summary), "facts must not expose secrets");
}

const packet = createVantaTwitterDraftPacket({
  generatedAt: "2026-04-24T12:30:00.000Z",
  socialContext: context,
});

assert.equal(packet.contextKind, "vanta-social-context-v1", "draft packet should record the social context contract");
assert.equal(packet.contextSourceCount, context.sourceFacts.length, "draft packet should record context source count");
assert.ok(
  packet.drafts.some((draft) => draft.sourceFacts.some((fact) => fact.id === "social-draft-only-boundary")),
  "at least one draft should use the loaded social operator source fact",
);

console.log("Vanta social Twitter context check: PASS");
