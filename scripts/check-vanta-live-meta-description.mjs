import { strict as assert } from "node:assert";

const defaultUrl = "https://vantaprivacy.xyz";
const publicUrl = process.env.VANTA_PUBLIC_SITE_URL ?? defaultUrl;

function extractMetaDescription(html) {
  const tag = html.match(/<meta\s+[^>]*name=["']description["'][^>]*>/iu)?.[0];
  assert.ok(tag, "Live site must include a crawler-visible meta description.");
  const content = tag.match(/\bcontent=["']([^"']+)["']/iu)?.[1];
  assert.ok(content, "Live meta description must include content.");
  return content;
}

const response = await fetch(publicUrl, {
  headers: {
    Accept: "text/html",
  },
  signal: AbortSignal.timeout(15_000),
});
assert.equal(response.ok, true, `Live site fetch must succeed for ${publicUrl}; got ${response.status}.`);

const html = await response.text();
const description = extractMetaDescription(html);

for (const phrase of [
  "alpha-stage zk research",
  "Not audited",
  "Production privacy is not enabled",
  "live anonymity set blocked",
  "/.well-known/vanta-audit.json",
]) {
  assert.ok(description.includes(phrase), `Live meta description missing safe phrase: ${phrase}`);
}

for (const forbidden of [
  /\bzk-powered privacy layer\b/iu,
  /\bbuilt for private send\b/iu,
  /\bprivate swap\b/iu,
  /\bprivate payment flows\b/iu,
  /\bfully private\b/iu,
  /\banonymous payments?\b/iu,
  /\buntraceable\b/iu,
  /\bproduction-ready\b/iu,
  /\blive mainnet private settlement\b/iu,
]) {
  assert.ok(!forbidden.test(description), `Live meta description contains forbidden claim: ${forbidden}`);
}

console.log("Vanta live meta-description check: PASS");
console.log(JSON.stringify({ description, publicUrl }, null, 2));
