import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const shieldPageSource = readFileSync(
  resolve(repoRoot, "src/pages/ShieldPage.tsx"),
  "utf8",
);

const failures = [];

function requireSourceIncludes(needle, message) {
  if (!shieldPageSource.includes(needle)) {
    failures.push(message);
  }
}

requireSourceIncludes(
  'import { useVantaShieldViewingKey } from "@/solana/useVantaShieldViewingKey";',
  "ShieldPage must import the local Shield viewing-key hook.",
);
requireSourceIncludes(
  "const viewingKey = useVantaShieldViewingKey();",
  "ShieldPage must create or load the local Shield viewing key for the connected wallet.",
);
requireSourceIncludes(
  "!viewingKey?.publicKey",
  "Shield state memo submission must wait for a viewing public key.",
);
requireSourceIncludes(
  "{ viewingPublicKey: viewingKey?.publicKey }",
  "Shield state memo constructors must receive the viewing public key.",
);

const nativeSolCall = shieldPageSource.match(
  /createNativeSolShieldMemoInstruction\([\s\S]*?\{ viewingPublicKey: viewingKey\?\.publicKey \},[\s\S]*?\)/u,
);
if (!nativeSolCall) {
  failures.push("Native SOL Shield state memo must use the viewing public key.");
}

const tokenCall = shieldPageSource.match(
  /createShieldMemoInstruction\([\s\S]*?\{ viewingPublicKey: viewingKey\?\.publicKey \},[\s\S]*?\)/u,
);
if (!tokenCall) {
  failures.push("Token Shield state memo must use the viewing public key.");
}

if (failures.length > 0) {
  console.error("vanta shield viewing-key UI: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("vanta shield viewing-key UI: PASS");
