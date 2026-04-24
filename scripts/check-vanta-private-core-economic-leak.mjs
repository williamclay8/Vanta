import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-core-economic-leak-"));
const tempTsDir = join(tempRoot, "ts");
const tempJsDir = join(tempRoot, "js");

const sourceFiles = [
  "vantaPrivateCore.ts",
  "vantaPrivateCoreSendProof.ts",
  "vantaPrivateCoreSwapProof.ts",
  "vantaPrivateCoreUnshieldProof.ts",
];

const expectedPackageScript = "node scripts/check-vanta-private-core-economic-leak.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function copySource(relativePath) {
  const source = readFileSync(resolve(repoRoot, "src/zk", relativePath), "utf8").replace(
    /from "@\/zk\/vantaPrivateCore"/g,
    'from "./vantaPrivateCore"',
  );
  writeFileSync(
    join(tempTsDir, relativePath),
    source,
  );
}

function patchCompiledImports(relativePath) {
  const filePath = join(tempJsDir, relativePath.replace(/\.ts$/, ".js"));
  const source = readFileSync(filePath, "utf8")
    .replace(/from "@\/zk\/vantaPrivateCore"/g, 'from "./vantaPrivateCore.js"')
    .replace(/from "\.\/vantaPrivateCore"/g, 'from "./vantaPrivateCore.js"');
  writeFileSync(filePath, source);
}

function readPackageJson() {
  return JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
}

function assertPackageWiring() {
  const packageJson = readPackageJson();
  assert(
    packageJson.scripts?.["private-core:economic-leak-check"] === expectedPackageScript,
    "Expected package.json to expose private-core:economic-leak-check.",
  );
  assert(
    packageJson.scripts?.["private-core:verify"]?.includes(
      "npm run private-core:economic-leak-check",
    ),
    "Expected private-core:verify to include private-core:economic-leak-check.",
  );
}

function compileProofBoundaries() {
  mkdirSync(tempTsDir, { recursive: true });

  for (const file of sourceFiles) {
    copySource(file);
  }

  execFileSync(
    resolve(repoRoot, "node_modules/.bin/tsc"),
    [
      ...sourceFiles.map((file) => join(tempTsDir, file)),
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

  for (const file of sourceFiles) {
    patchCompiledImports(file);
  }
}

function serializePublicInputs(publicInputs) {
  return JSON.stringify(publicInputs);
}

function extractNoirPublicInputNames(relativePath) {
  const source = readFileSync(resolve(repoRoot, relativePath), "utf8");
  const mainMatch = source.match(/fn main\(([\s\S]*?)\n\)/);
  assert(mainMatch, `Expected to find fn main(...) in ${relativePath}.`);

  return mainMatch[1]
    .split("\n")
    .map((line) => line.trim().replace(/,$/, ""))
    .filter((line) => line.includes(": pub Field"))
    .map((line) => line.split(":")[0].trim());
}

function assertNoirPublicInputKeys(args) {
  const actualKeys = extractNoirPublicInputNames(args.noirSourcePath).sort();
  const expectedKeys = [...args.expectedKeys].sort();

  assert(
    JSON.stringify(actualKeys) === JSON.stringify(expectedKeys),
    `${args.lane} Noir public input keys drifted.\nExpected: ${expectedKeys.join(", ")}\nActual: ${actualKeys.join(", ")}`,
  );
}

function assertPublicInputKeys(args) {
  const actualKeys = Object.keys(args.publicInputs).sort();
  const expectedKeys = [...args.expectedKeys].sort();

  assert(
    JSON.stringify(actualKeys) === JSON.stringify(expectedKeys),
    `${args.lane} proof public input keys drifted.\nExpected: ${expectedKeys.join(", ")}\nActual: ${actualKeys.join(", ")}`,
  );
}

function assertNoForbiddenEconomics(args) {
  const publicInputText = serializePublicInputs(args.publicInputs);
  const publicInputValues = new Set(Object.values(args.publicInputs).map(String));

  for (const fieldName of args.forbiddenFieldNames) {
    assert(
      !Object.prototype.hasOwnProperty.call(args.publicInputs, fieldName),
      `${args.lane} proof public inputs leaked raw economic field key: ${fieldName}.`,
    );
    assert(
      !publicInputText.includes(`"${fieldName}"`),
      `${args.lane} serialized proof public inputs leaked raw economic field label: ${fieldName}.`,
    );
  }

  for (const rawValue of args.forbiddenRawValues) {
    assert(
      !publicInputValues.has(String(rawValue)),
      `${args.lane} proof public inputs leaked raw economic value: ${rawValue}.`,
    );
  }
}

function assertHashBoundary(args) {
  const hashValue = args.publicInputs[args.hashKey];

  assert(hashValue, `${args.lane} proof public inputs must expose ${args.hashKey}.`);
  assert(/^\d+$/.test(hashValue), `${args.lane} ${args.hashKey} must be a field decimal string.`);

  for (const rawValue of args.forbiddenRawValues) {
    assert(
      hashValue !== String(rawValue),
      `${args.lane} ${args.hashKey} must not equal raw economic value ${rawValue}.`,
    );
  }

  assert(
    args.sourcePublicInputs[args.hashKey] === undefined,
    `${args.lane} sourcePublicInputs should keep raw source terms, not duplicate ${args.hashKey}.`,
  );
}

function assertRawEconomicsStayWitnessPrivate(args) {
  const sourceText = JSON.stringify(args.sourcePublicInputs);
  const privateWitnessText = JSON.stringify(args.privateWitness);

  for (const rawValue of args.requiredRawValues) {
    const value = String(rawValue);
    assert(
      sourceText.includes(value) || privateWitnessText.includes(value),
      `${args.lane} expected raw term ${value} to remain available only in sourcePublicInputs/privateWitness.`,
    );
  }
}

function assertLane(args) {
  assertPublicInputKeys(args);
  assertNoirPublicInputKeys(args);
  assertNoForbiddenEconomics(args);
  assertHashBoundary(args);
  assertRawEconomicsStayWitnessPrivate(args);
  console.log(`private-core ${args.lane} economic leak check: PASS`);
}

try {
  assertPackageWiring();
  compileProofBoundaries();

  const sendModule = await import(pathToFileURL(join(tempJsDir, "vantaPrivateCoreSendProof.js")).href);
  const swapModule = await import(pathToFileURL(join(tempJsDir, "vantaPrivateCoreSwapProof.js")).href);
  const unshieldModule = await import(
    pathToFileURL(join(tempJsDir, "vantaPrivateCoreUnshieldProof.js")).href
  );

  const sendBoundary =
    sendModule.getVantaPrivateCoreFixedDepthSendFixtureV0().validBoundary;
  const swapBoundary =
    swapModule.getVantaPrivateCoreFixedDepthSwapFixtureV0().validBoundary;
  const unshieldFixture = unshieldModule.getVantaPrivateCoreFixedDepthUnshieldFixtureV0();
  const unshieldBoundary = unshieldFixture.validBoundary;

  assertLane({
    lane: "send",
    noirSourcePath: "zk/noir/vanta_private_core_single_note_send/src/main.nr",
    publicInputs: sendBoundary.noirWitnessPackage.publicInputs,
    sourcePublicInputs: sendBoundary.publicInputs,
    privateWitness: sendBoundary.noirWitnessPackage.privateWitness,
    hashKey: "send_economic_terms_hash",
    expectedKeys: [
      "state_root",
      "input_nullifier",
      "recipient_commitment",
      "change_commitment",
      "send_economic_terms_hash",
      "note_version",
      "send_context_tag_hi",
      "send_context_tag_lo",
    ],
    forbiddenFieldNames: [
      "assetId",
      "asset_id",
      "amount",
      "sendAmount",
      "send_amount",
      "changeAmount",
      "change_amount",
    ],
    forbiddenRawValues: [
      sendBoundary.publicInputs.assetId,
      sendBoundary.publicInputs.sendAmount.toString(),
      sendBoundary.publicInputs.changeAmount?.toString(),
    ].filter(Boolean),
    requiredRawValues: [
      sendBoundary.publicInputs.assetId,
      sendBoundary.publicInputs.sendAmount.toString(),
      sendBoundary.publicInputs.changeAmount?.toString(),
    ].filter(Boolean),
  });

  assertLane({
    lane: "swap",
    noirSourcePath: "zk/noir/vanta_private_core_single_note_swap/src/main.nr",
    publicInputs: swapBoundary.noirWitnessPackage.publicInputs,
    sourcePublicInputs: swapBoundary.publicInputs,
    privateWitness: swapBoundary.noirWitnessPackage.privateWitness,
    hashKey: "swap_economic_terms_hash",
    expectedKeys: [
      "state_root",
      "input_nullifier",
      "output_commitment",
      "swap_economic_terms_hash",
      "input_note_version",
      "output_note_version",
      "swap_context_tag_hi",
      "swap_context_tag_lo",
    ],
    forbiddenFieldNames: [
      "inputAssetId",
      "input_asset_id",
      "outputAssetId",
      "output_asset_id",
      "inputAmount",
      "input_amount",
      "outputAmount",
      "output_amount",
    ],
    forbiddenRawValues: [
      swapBoundary.publicInputs.inputAssetId,
      swapBoundary.publicInputs.outputAssetId,
      swapBoundary.publicInputs.inputAmount.toString(),
      swapBoundary.publicInputs.outputAmount.toString(),
    ],
    requiredRawValues: [
      swapBoundary.publicInputs.inputAssetId,
      swapBoundary.publicInputs.outputAssetId,
      swapBoundary.publicInputs.inputAmount.toString(),
      swapBoundary.publicInputs.outputAmount.toString(),
    ],
  });

  assertLane({
    lane: "unshield",
    noirSourcePath: "zk/noir/vanta_private_core_single_note_unshield/src/main.nr",
    publicInputs: unshieldBoundary.noirWitnessPackage.publicInputs,
    sourcePublicInputs: unshieldBoundary.publicInputs,
    privateWitness: unshieldBoundary.noirWitnessPackage.privateWitness,
    hashKey: "unshield_economic_terms_hash",
    expectedKeys: [
      "state_root",
      "nullifier",
      "consume_context_tag_hi",
      "consume_context_tag_lo",
      "unshield_economic_terms_hash",
      "note_version",
    ],
    forbiddenFieldNames: [
      "releaseDestination",
      "release_destination",
      "assetId",
      "asset_id",
      "amount",
    ],
    forbiddenRawValues: [
      unshieldBoundary.publicInputs.releaseDestination,
      unshieldBoundary.publicInputs.assetId,
      unshieldBoundary.publicInputs.amount.toString(),
    ],
    requiredRawValues: [
      unshieldBoundary.publicInputs.releaseDestination,
      unshieldBoundary.publicInputs.assetId,
      unshieldBoundary.publicInputs.amount.toString(),
    ],
  });

  console.log("private-core economic leak boundary: PASS");
} catch (error) {
  const stdout = String(error.stdout ?? "");
  const stderr = String(error.stderr ?? "");
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
