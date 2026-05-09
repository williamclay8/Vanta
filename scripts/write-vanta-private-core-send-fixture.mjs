import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { poseidon1, poseidon2, poseidon6, poseidon8, poseidon15 } from "poseidon-lite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outputPath = resolve(
  repoRoot,
  "zk/noir/vanta_private_core_single_note_send/Prover.toml",
);
const fixtureMode = process.argv[2] ?? "valid";

async function main() {
  if (
    fixtureMode !== "valid" &&
    fixtureMode !== "invalid-direction" &&
    fixtureMode !== "invalid-leaf-index" &&
    fixtureMode !== "invalid-amount-range" &&
    fixtureMode !== "valid-amount-carry"
  ) {
    throw new Error(
      'Expected fixture mode "valid", "invalid-direction", "invalid-leaf-index", "invalid-amount-range", or "valid-amount-carry". Example: node scripts/write-vanta-private-core-send-fixture.mjs invalid-direction',
    );
  }

  mkdirSync(resolve(repoRoot, ".tmp"), { recursive: true });
  const tempRoot = mkdtempSync(resolve(repoRoot, ".tmp/vanta-private-core-send-fixture-"));
  const tempTsDir = join(tempRoot, "ts");
  const tempJsDir = join(tempRoot, "js");

  try {
    const privateCoreSourcePath = resolve(repoRoot, "src/zk/vantaPrivateCore.ts");
    const sendProofSourcePath = resolve(repoRoot, "src/zk/vantaPrivateCoreSendProof.ts");
    const privateCoreSource = readFileSync(privateCoreSourcePath, "utf8");
    const sendProofSource = readFileSync(sendProofSourcePath, "utf8").replace(
      /from "@\/zk\/vantaPrivateCore"/g,
      'from "./vantaPrivateCore"',
    );

    mkdirSync(tempTsDir, { recursive: true });
    writeFileSync(join(tempTsDir, "vantaPrivateCore.ts"), privateCoreSource);
    writeFileSync(join(tempTsDir, "vantaPrivateCoreSendProof.ts"), sendProofSource);

    execFileSync(
      resolve(repoRoot, "node_modules/.bin/tsc"),
      [
        join(tempTsDir, "vantaPrivateCore.ts"),
        join(tempTsDir, "vantaPrivateCoreSendProof.ts"),
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

    const compiledPath = join(tempJsDir, "vantaPrivateCoreSendProof.js");
    const compiledSource = readFileSync(compiledPath, "utf8").replace(
      /from "\.\/vantaPrivateCore"/g,
      'from "./vantaPrivateCore.js"',
    );
    writeFileSync(compiledPath, compiledSource);

    const compiledModule = await import(pathToFileURL(compiledPath).href);
    const fixture = compiledModule.getVantaPrivateCoreFixedDepthSendFixtureV0();
    const witnessPackage = createWitnessPackageForMode(fixture, fixtureMode);
    const toml = compiledModule.serializeVantaPrivateCoreNoirSendWitnessPackageToToml(
      witnessPackage,
    );

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${toml}\n`);
    console.log(`Wrote ${fixtureMode} fixture to ${outputPath}`);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function createWitnessPackageForMode(fixture, mode) {
  const validWitnessPackage = fixture.validBoundary.noirWitnessPackage;

  if (mode === "valid") {
    return validWitnessPackage;
  }

  if (mode === "invalid-direction") {
    return fixture.invalidDirectionWitnessPackage;
  }

  if (mode === "invalid-leaf-index") {
    return {
      ...validWitnessPackage,
      privateWitness: {
        ...validWitnessPackage.privateWitness,
        input_leaf_index: String(Number(validWitnessPackage.privateWitness.input_leaf_index) + 1),
      },
    };
  }

  if (mode === "invalid-amount-range") {
    return createAmountAdjustedWitnessPackage(validWitnessPackage, {
      carryAwareInputAmount: false,
      sendAmountHi: 0n,
      sendAmountLo: 1n << 64n,
    });
  }

  if (mode === "valid-amount-carry") {
    return createAmountAdjustedWitnessPackage(validWitnessPackage, {
      carryAwareInputAmount: true,
      changeAmountHi: 0n,
      changeAmountLo: 1n,
      sendAmountHi: 0n,
      sendAmountLo: (1n << 64n) - 1n,
    });
  }

  throw new Error(`Unsupported fixture mode ${mode}`);
}

function createAmountAdjustedWitnessPackage(validWitnessPackage, options) {
  const privateWitness = validWitnessPackage.privateWitness;
  const sendAmountLo = options.sendAmountLo ?? BigInt(privateWitness.send_amount_lo);
  const sendAmountHi = options.sendAmountHi ?? BigInt(privateWitness.send_amount_hi);
  const changeAmountLo = options.changeAmountLo ?? BigInt(privateWitness.change_amount_lo);
  const changeAmountHi = options.changeAmountHi ?? BigInt(privateWitness.change_amount_hi);
  const adjustedPrivateWitness = {
    ...privateWitness,
    send_amount_lo: sendAmountLo.toString(10),
    send_amount_hi: sendAmountHi.toString(10),
    change_amount_lo: changeAmountLo.toString(10),
    change_amount_hi: changeAmountHi.toString(10),
  };
  const inputAmount = options.carryAwareInputAmount
    ? computeCarriedAmount({
        changeAmountHi,
        changeAmountLo,
        sendAmountHi,
        sendAmountLo,
      })
    : {
        hi: sendAmountHi + changeAmountHi,
        lo: sendAmountLo + changeAmountLo,
      };
  const inputCommitment = deriveNoteCommitment({
    amount_hi: inputAmount.hi.toString(10),
    amount_lo: inputAmount.lo.toString(10),
    asset_id_hi: adjustedPrivateWitness.asset_id_hi,
    asset_id_lo: adjustedPrivateWitness.asset_id_lo,
    blinding_hi: adjustedPrivateWitness.input_blinding_hi,
    blinding_lo: adjustedPrivateWitness.input_blinding_lo,
    derivation_tag_hi: adjustedPrivateWitness.input_derivation_tag_hi,
    derivation_tag_lo: adjustedPrivateWitness.input_derivation_tag_lo,
    note_nonce_hi: adjustedPrivateWitness.input_note_nonce_hi,
    note_nonce_lo: adjustedPrivateWitness.input_note_nonce_lo,
    note_secret_hi: adjustedPrivateWitness.input_note_secret_hi,
    note_secret_lo: adjustedPrivateWitness.input_note_secret_lo,
    note_type_code: adjustedPrivateWitness.input_note_type_code,
    note_version: validWitnessPackage.publicInputs.note_version,
    owner_public_key_hi: adjustedPrivateWitness.sender_public_key_hi,
    owner_public_key_lo: adjustedPrivateWitness.sender_public_key_lo,
  });
  const inputLeaf = poseidon1([BigInt(inputCommitment)]).toString(10);
  const stateRoot = deriveRoot({
    leaf: inputLeaf,
    path: adjustedPrivateWitness.membership_path,
    pathDirectionBits: adjustedPrivateWitness.membership_path_direction_bits,
  });
  const inputNullifier = poseidon6([
    BigInt(adjustedPrivateWitness.input_note_secret_hi),
    BigInt(adjustedPrivateWitness.input_note_secret_lo),
    BigInt(adjustedPrivateWitness.input_note_nonce_hi),
    BigInt(adjustedPrivateWitness.input_note_nonce_lo),
    BigInt(stateRoot),
    BigInt(inputLeaf),
  ]).toString(10);
  const recipientCommitment = deriveNoteCommitment({
    amount_hi: adjustedPrivateWitness.send_amount_hi,
    amount_lo: adjustedPrivateWitness.send_amount_lo,
    asset_id_hi: adjustedPrivateWitness.asset_id_hi,
    asset_id_lo: adjustedPrivateWitness.asset_id_lo,
    blinding_hi: adjustedPrivateWitness.recipient_blinding_hi,
    blinding_lo: adjustedPrivateWitness.recipient_blinding_lo,
    derivation_tag_hi: adjustedPrivateWitness.recipient_derivation_tag_hi,
    derivation_tag_lo: adjustedPrivateWitness.recipient_derivation_tag_lo,
    note_nonce_hi: adjustedPrivateWitness.recipient_note_nonce_hi,
    note_nonce_lo: adjustedPrivateWitness.recipient_note_nonce_lo,
    note_secret_hi: adjustedPrivateWitness.recipient_note_secret_hi,
    note_secret_lo: adjustedPrivateWitness.recipient_note_secret_lo,
    note_type_code: adjustedPrivateWitness.recipient_note_type_code,
    note_version: validWitnessPackage.publicInputs.note_version,
    owner_public_key_hi: adjustedPrivateWitness.recipient_owner_public_key_hi,
    owner_public_key_lo: adjustedPrivateWitness.recipient_owner_public_key_lo,
  });
  const changeCommitment =
    changeAmountLo + changeAmountHi === 0n
      ? "0"
      : deriveNoteCommitment({
          amount_hi: adjustedPrivateWitness.change_amount_hi,
          amount_lo: adjustedPrivateWitness.change_amount_lo,
          asset_id_hi: adjustedPrivateWitness.asset_id_hi,
          asset_id_lo: adjustedPrivateWitness.asset_id_lo,
          blinding_hi: adjustedPrivateWitness.change_blinding_hi,
          blinding_lo: adjustedPrivateWitness.change_blinding_lo,
          derivation_tag_hi: adjustedPrivateWitness.change_derivation_tag_hi,
          derivation_tag_lo: adjustedPrivateWitness.change_derivation_tag_lo,
          note_nonce_hi: adjustedPrivateWitness.change_note_nonce_hi,
          note_nonce_lo: adjustedPrivateWitness.change_note_nonce_lo,
          note_secret_hi: adjustedPrivateWitness.change_note_secret_hi,
          note_secret_lo: adjustedPrivateWitness.change_note_secret_lo,
          note_type_code: adjustedPrivateWitness.change_note_type_code,
          note_version: validWitnessPackage.publicInputs.note_version,
          owner_public_key_hi: adjustedPrivateWitness.change_owner_public_key_hi,
          owner_public_key_lo: adjustedPrivateWitness.change_owner_public_key_lo,
        });
  const sendEconomicTermsHash = poseidon8([
    BigInt(adjustedPrivateWitness.asset_id_hi),
    BigInt(adjustedPrivateWitness.asset_id_lo),
    sendAmountLo,
    sendAmountHi,
    changeAmountLo,
    changeAmountHi,
    BigInt(validWitnessPackage.publicInputs.note_version),
    0n,
  ]).toString(10);
  const sendContextTag = poseidon6([
    BigInt(inputNullifier),
    BigInt(recipientCommitment),
    BigInt(changeCommitment),
    BigInt(sendEconomicTermsHash),
    BigInt(validWitnessPackage.publicInputs.note_version),
    0n,
  ]).toString(10);

  return {
    ...validWitnessPackage,
    publicInputs: {
      ...validWitnessPackage.publicInputs,
      change_commitment: changeCommitment,
      input_nullifier: inputNullifier,
      recipient_commitment: recipientCommitment,
      send_context_tag_hi: "0",
      send_context_tag_lo: sendContextTag,
      send_economic_terms_hash: sendEconomicTermsHash,
      state_root: stateRoot,
    },
    privateWitness: adjustedPrivateWitness,
  };
}

function computeCarriedAmount({ changeAmountHi, changeAmountLo, sendAmountHi, sendAmountLo }) {
  const u64Modulus = 1n << 64n;
  const loSum = sendAmountLo + changeAmountLo;
  const carry = loSum >= u64Modulus ? 1n : 0n;
  return {
    hi: sendAmountHi + changeAmountHi + carry,
    lo: loSum - carry * u64Modulus,
  };
}

function deriveNoteCommitment(fields) {
  const noteHeader = poseidon2([
    BigInt(fields.note_version),
    BigInt(fields.note_type_code),
  ]);

  return poseidon15([
    noteHeader,
    BigInt(fields.asset_id_hi),
    BigInt(fields.asset_id_lo),
    BigInt(fields.amount_lo),
    BigInt(fields.amount_hi),
    BigInt(fields.owner_public_key_hi),
    BigInt(fields.owner_public_key_lo),
    BigInt(fields.note_nonce_hi),
    BigInt(fields.note_nonce_lo),
    BigInt(fields.note_secret_hi),
    BigInt(fields.note_secret_lo),
    BigInt(fields.blinding_hi),
    BigInt(fields.blinding_lo),
    BigInt(fields.derivation_tag_hi),
    BigInt(fields.derivation_tag_lo),
  ]).toString(10);
}

function deriveRoot({ leaf, path, pathDirectionBits }) {
  return path.reduce((current, sibling, index) => {
    const isCurrentRight = pathDirectionBits[index] === "1";
    return (
      isCurrentRight
        ? poseidon2([BigInt(sibling), BigInt(current)])
        : poseidon2([BigInt(current), BigInt(sibling)])
    ).toString(10);
  }, leaf);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
} finally {
  setImmediate(() => process.exit(process.exitCode ?? 0));
}
