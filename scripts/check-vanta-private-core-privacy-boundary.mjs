import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-privacy-boundary-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function compileBoundary() {
  mkdirSync(tempTsDir, { recursive: true });
  writeFileSync(
    join(tempTsDir, "vantaPrivacyBoundary.ts"),
    readFileSync(resolve(repoRoot, "src/privacy/vantaPrivacyBoundary.ts"), "utf8"),
  );

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      join(tempTsDir, "vantaPrivacyBoundary.ts"),
      "--target",
      "ES2022",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--lib",
      "ES2022,DOM",
      "--skipLibCheck",
      "--outDir",
      tempJsDir,
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );
}

const hiddenEconomicForbiddenFields = new Set([
  "asset",
  "amount",
  "change-amount",
  "input-asset",
  "output-asset",
  "input-amount",
  "output-amount",
  "release-destination",
  "source-mint",
  "target-mint",
  "relayer-fee",
]);

const broadPrivacyClaimPhrases = [
  "fully private",
  "private by default",
  "hidden economic terms",
];

try {
  compileBoundary();
  const {
    VANTA_PRIVACY_BOUNDARY_CONTRACT_VERSION,
    getVantaPrivacyBoundaryDescriptor,
    laneHidesEconomicTerms,
    listVantaPrivacyBoundaryDescriptors,
  } = await import(pathToFileURL(join(tempJsDir, "vantaPrivacyBoundary.js")).href);

  assert(
    VANTA_PRIVACY_BOUNDARY_CONTRACT_VERSION === "vanta-privacy-boundary-contract-0.1",
    "Unexpected privacy boundary contract version.",
  );

  const descriptors = listVantaPrivacyBoundaryDescriptors();
  assert(descriptors.length === 5, "Expected five current privacy lane descriptors.");

  for (const descriptor of descriptors) {
    if (descriptor.tier !== "v2-hidden-economic-terms") {
      continue;
    }

    const leakedFields = [
      ...descriptor.publicDisclosure,
      ...descriptor.publicRequestDisclosure,
    ].filter((field) => hiddenEconomicForbiddenFields.has(field));
    assert(
      leakedFields.length === 0,
      `${descriptor.lane} cannot claim v2 hidden economic terms while disclosing ${leakedFields.join(", ")}.`,
    );
    assert(
      descriptor.blockersToHiddenEconomicTerms.length === 0,
      `${descriptor.lane} cannot claim v2 hidden economic terms with unresolved blockers.`,
    );
  }

  const currentPublicEconomicLanes = [];
  for (const lane of currentPublicEconomicLanes) {
    const descriptor = getVantaPrivacyBoundaryDescriptor(lane);
    assert(
      descriptor.tier === "v1-public-economic-terms",
      `Expected ${lane} to stay classified as public-economic-terms.`,
    );
    assert(!laneHidesEconomicTerms(lane), `Expected ${lane} not to hide economic terms.`);
  }

  const send = getVantaPrivacyBoundaryDescriptor("private-core-send");
  assert(
    send.tier === "v1.5-hash-bound-public-request-terms",
    "Expected private-core-send to be hash-bound after the send economic-terms hash upgrade.",
  );
  assert(
    !send.publicDisclosure.includes("asset") &&
      !send.publicDisclosure.includes("amount") &&
      !send.publicDisclosure.includes("change-amount"),
    "Send proof disclosure must not expose raw asset or amounts.",
  );
  assert(
    send.publicDisclosure.includes("economic-terms-hash"),
    "Send proof disclosure must include the public economic-terms hash.",
  );
  for (const field of ["asset", "amount", "change-amount"]) {
    assert(
      send.publicRequestDisclosure.includes(field),
      `Send request/operator disclosure must include ${field}.`,
    );
  }

  const swap = getVantaPrivacyBoundaryDescriptor("private-core-swap");
  assert(
    swap.tier === "v1.5-hash-bound-public-request-terms",
    "Expected private-core-swap to be hash-bound after the swap economic-terms hash upgrade.",
  );
  assert(
    !swap.publicDisclosure.includes("input-asset") &&
      !swap.publicDisclosure.includes("output-asset") &&
      !swap.publicDisclosure.includes("input-amount") &&
      !swap.publicDisclosure.includes("output-amount"),
    "Swap proof disclosure must not expose raw pair or amounts.",
  );
  assert(
    swap.publicDisclosure.includes("economic-terms-hash"),
    "Swap proof disclosure must include the public economic-terms hash.",
  );
  for (const field of ["input-asset", "output-asset", "input-amount", "output-amount"]) {
    assert(
      swap.publicRequestDisclosure.includes(field),
      `Swap request/operator disclosure must include ${field}.`,
    );
  }

  const unshield = getVantaPrivacyBoundaryDescriptor("private-core-unshield");
  assert(
    unshield.tier === "v1.5-hash-bound-public-request-terms",
    "Expected private-core-unshield to be hash-bound after the unshield economic-terms hash upgrade.",
  );
  assert(
    !unshield.publicDisclosure.includes("release-destination") &&
      !unshield.publicDisclosure.includes("asset") &&
      !unshield.publicDisclosure.includes("amount"),
    "Unshield proof disclosure must not expose raw destination, asset, or amount.",
  );
  assert(
    unshield.publicDisclosure.includes("economic-terms-hash"),
    "Unshield proof disclosure must include the public economic-terms hash.",
  );
  for (const field of ["release-destination", "asset", "amount"]) {
    assert(
      unshield.publicRequestDisclosure.includes(field),
      `Unshield request/operator disclosure must include ${field}.`,
    );
  }
  assert(!laneHidesEconomicTerms("private-core-unshield"), "Expected unshield not to claim v2 hidden terms.");

  for (const lane of ["private-pool-v2-shield", "private-pool-v2-claim"]) {
    const descriptor = getVantaPrivacyBoundaryDescriptor(lane);
    assert(
      descriptor.tier === "v1.5-hash-bound-public-request-terms",
      `Expected ${lane} to be hash-bound public-request tier.`,
    );
    assert(!laneHidesEconomicTerms(lane), `Expected ${lane} not to hide economic terms yet.`);
    assert(
      JSON.stringify(descriptor.publicDisclosure) === JSON.stringify(["context-tag"]),
      `Expected ${lane} public proof disclosure to stay claim-safe and hash-only.`,
    );
    assert(
      descriptor.publicRequestDisclosure.includes("asset"),
      `Expected ${lane} request disclosure to include asset.`,
    );
    assert(
      descriptor.publicRequestDisclosure.includes("amount"),
      `Expected ${lane} request disclosure to include amount.`,
    );
    assert(
      descriptor.blockersToHiddenEconomicTerms.length > 0,
      `Expected ${lane} to keep blockers before any hidden-economic-terms claim.`,
    );
  }

  for (const descriptor of descriptors) {
    if (descriptor.tier === "v2-hidden-economic-terms") {
      continue;
    }

    const lowerTruthLabel = descriptor.truthLabel.toLowerCase();
    const bannedPhrase = broadPrivacyClaimPhrases.find((phrase) =>
      lowerTruthLabel.includes(phrase),
    );
    assert(
      !bannedPhrase,
      `${descriptor.lane} cannot use broad privacy phrase "${bannedPhrase}" at tier ${descriptor.tier}.`,
    );
  }

  console.log("private-core privacy boundary: PASS");
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}
