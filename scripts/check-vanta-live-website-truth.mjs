import assert from "node:assert/strict";

const publicSiteUrl = process.env.VANTA_PUBLIC_SITE_URL ?? "https://vantaprivacy.xyz";
const publicOrigin = new URL(publicSiteUrl);
const requireCurrentVerified = process.argv.includes("--require-current-verified");

const routes = ["/", "/app", "/app/proof"];
const homepageForbiddenPhrases = [
  "No one watching",
  "private balance",
  "Settle privately",
  "Move assets into a private balance",
];
const payForbiddenPhrases = ["Settle privately"];

function publicUrl(path) {
  return new URL(path, publicOrigin).toString();
}

async function fetchText(path, accept = "text/html,application/json,*/*") {
  const url = publicUrl(path);
  const response = await fetch(url, {
    headers: { Accept: accept },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  assert.equal(response.ok, true, `Live fetch must succeed for ${url}; got ${response.status}.`);
  return {
    contentType: response.headers.get("content-type") ?? "",
    path,
    status: response.status,
    text,
    url,
  };
}

function htmlAssetRefs(html) {
  return [...html.matchAll(/\b(?:src|href)=["']\/?(assets\/[^"']+\.js)["']/gu)]
    .map((match) => "/" + match[1])
    .sort();
}

function jsChunkRefs(source) {
  return [...source.matchAll(/\b([A-Za-z0-9][A-Za-z0-9._-]+-[A-Za-z0-9_-]+\.js)\b/gu)]
    .map((match) => "/assets/" + match[1])
    .sort();
}

function assertAbsent(source, phrases, label) {
  for (const phrase of phrases) {
    assert.equal(
      source.includes(phrase),
      false,
      `${label} must not contain stale public copy: ${phrase}`,
    );
  }
}

const routeResults = [];
const htmlAssets = new Set();

for (const route of routes) {
  const result = await fetchText(route);
  const assets = htmlAssetRefs(result.text);
  assert.ok(assets.length > 0, `Live route ${route} must reference built JS assets.`);
  assertAbsent(result.text, homepageForbiddenPhrases, `Live route HTML ${route}`);
  routeResults.push({
    assets,
    contentType: result.contentType,
    route,
    status: result.status,
  });
  assets.forEach((asset) => htmlAssets.add(asset));
}

const fetchedAssets = new Map();
const pendingAssets = [...htmlAssets];

for (const asset of pendingAssets) {
  if (fetchedAssets.has(asset)) {
    continue;
  }
  const result = await fetchText(asset, "application/javascript,*/*");
  fetchedAssets.set(asset, result.text);
  for (const chunk of jsChunkRefs(result.text)) {
    if (!fetchedAssets.has(chunk) && !pendingAssets.includes(chunk)) {
      pendingAssets.push(chunk);
    }
  }
}

const assetPaths = [...fetchedAssets.keys()].sort();
const homePageChunk = assetPaths.find((asset) => /\/HomePage-[^/]+\.js$/u.test(asset));
const payPageChunk = assetPaths.find((asset) => /\/PayPage-[^/]+\.js$/u.test(asset));
assert.ok(homePageChunk, "Live router bundle must reference a HomePage chunk.");
assert.ok(payPageChunk, "Live router bundle must reference a PayPage chunk.");

assertAbsent(fetchedAssets.get(homePageChunk), homepageForbiddenPhrases, `Live ${homePageChunk}`);
assertAbsent(fetchedAssets.get(payPageChunk), payForbiddenPhrases, `Live ${payPageChunk}`);

const manifestResult = await fetchText("/.well-known/vanta-audit.json", "application/json,*/*");
const manifest = JSON.parse(manifestResult.text);
const currentEntryAsset = routeResults.find((result) => result.route === "/")?.assets.find(
  (asset) => /\/assets\/index-[^/]+\.js$/u.test(asset),
);
const currentEntryRef = currentEntryAsset?.replace(/^\//u, "");
const manifestTruthBoundary = String(manifest.websiteDeployment?.truthBoundary ?? "");
const manifestMentionsCurrentEntry = currentEntryRef
  ? manifestTruthBoundary.includes(currentEntryRef)
  : false;

assert.equal(manifest.productionReady, false, "Public manifest must keep productionReady false.");
assert.equal(manifest.mainnetReady, false, "Public manifest must keep mainnetReady false.");
assert.equal(manifest.privacyClaimAllowed, false, "Public manifest must keep privacyClaimAllowed false.");
assert.equal(manifest.anonymityClaimAllowed, false, "Public manifest must keep anonymityClaimAllowed false.");

if (manifest.liveDeploymentVerified === true || requireCurrentVerified) {
  assert.equal(
    manifest.liveDeploymentVerified,
    true,
    "Strict live deployment check requires liveDeploymentVerified=true.",
  );
  assert.equal(
    manifestMentionsCurrentEntry,
    true,
    `Strict live deployment check requires manifest truthBoundary to mention ${currentEntryRef}.`,
  );
}

const anonymityDepth = manifest.currentBlockers?.find((blocker) => blocker?.id === "public-anonymity-depth");
assert.equal(anonymityDepth?.currentDistinctCommitments, 2);
assert.equal(anonymityDepth?.minimumDistinctCommitments, 1024);

console.log("Vanta live website truth check: PASS");
console.log(JSON.stringify(
  {
    assetCount: assetPaths.length,
    homePageChunk,
    liveDeploymentVerified: manifest.liveDeploymentVerified,
    manifestMentionsCurrentEntry,
    payPageChunk,
    publicSiteUrl: publicOrigin.toString().replace(/\/$/u, ""),
    requireCurrentVerified,
    routeResults,
    websiteDeployment: manifest.websiteDeployment,
  },
  null,
  2,
));
