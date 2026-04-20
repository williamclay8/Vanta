import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const shieldStateSource = readFileSync(
  resolve("src/solana/vantaShieldState.ts"),
  "utf8",
);
assert.ok(
  shieldStateSource.includes("VANTA_NATIVE_SOL_SHIELD_MEMO_PREFIX"),
  "Shield state must define a native SOL shield memo prefix.",
);
assert.ok(
  shieldStateSource.includes("createNativeSolShieldMemoInstruction"),
  "Shield state must export a native SOL shield memo instruction.",
);
assert.ok(
  shieldStateSource.includes('kind: "native_sol_shield"'),
  "Native SOL shield memo must use native_sol_shield kind.",
);
assert.ok(
  shieldStateSource.includes("parseNativeSolShieldMemo"),
  "Shield state must parse native SOL shield memos.",
);
assert.ok(
  shieldStateSource.includes("directShieldedSolNotes"),
  "Shield state must include direct SOL shield notes.",
);
assert.ok(
  shieldStateSource.includes("...directShieldedSolNotes"),
  "Shielded SOL notes must include direct native SOL shield entries.",
);
assert.ok(
  shieldStateSource.includes("note.owner === args.owner && note.vaultOwner === args.vaultOwner"),
  "Direct native SOL shield notes must be scoped to the active owner and vault.",
);

const shieldPageSource = readFileSync(resolve("src/pages/ShieldPage.tsx"), "utf8");
assert.ok(
  shieldPageSource.includes("beginNativeSolShieldTransfer"),
  "Shield page must have a native SOL shield path.",
);
assert.ok(
  shieldPageSource.includes("Shielded SOL"),
  "Shield page must label SOL as Shielded SOL.",
);

console.log("Vanta native SOL shield check: PASS");
