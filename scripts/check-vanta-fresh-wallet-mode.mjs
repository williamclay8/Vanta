import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const appLayout = read("src/components/AppLayout.tsx");
const walletContext = read("src/data/context/WalletContext.tsx");
const freshWallet = read("src/solana/freshWallet.ts");
const styles = read("src/styles.css");
const packageJson = read("package.json");

const failures = [];

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) {
    failures.push(message);
  }
}

requireIncludes(
  freshWallet,
  "Keypair.generate()",
  "Fresh wallet mode must generate a Solana keypair locally in the browser.",
);
requireIncludes(
  freshWallet,
  "exportFreshWalletRecoveryFile",
  "Fresh wallet mode must produce an explicit recovery file export payload.",
);
requireIncludes(
  freshWallet,
  "vanta-fresh-wallet",
  "Fresh wallet recovery files must be clearly Vanta-scoped.",
);
requireIncludes(
  appLayout,
  "Create fresh wallet",
  "Wallet picker must expose a create-fresh-wallet action.",
);
requireIncludes(
  appLayout,
  "Generated in this browser",
  "Fresh wallet UI must make browser-local generation clear.",
);
requireIncludes(
  appLayout,
  "Download recovery file",
  "Fresh wallet UI must require an explicit recovery export action.",
);
requireIncludes(
  appLayout,
  "Import it into Phantom or Solflare to sign live actions",
  "Fresh wallet UI must not imply the generated wallet can already sign live Vanta actions.",
);
requireIncludes(
  walletContext,
  "freshWalletAddress",
  "Wallet context must expose the generated fresh wallet address separately from connected signer state.",
);
requireIncludes(
  styles,
  ".wallet-picker__fresh",
  "Fresh wallet UI styles must be present.",
);
requireIncludes(
  packageJson,
  "\"wallet:fresh-wallet-check\"",
  "Package scripts must expose the fresh wallet checker.",
);
requireIncludes(
  packageJson,
  "\"wallet:fresh-wallet-browser-check\"",
  "Package scripts must expose browser-backed fresh wallet verification.",
);

for (const banned of [
  "server-side fresh wallet",
  "custodial fresh wallet",
  "fresh wallet is private",
]) {
  if (`${appLayout}\n${freshWallet}`.toLowerCase().includes(banned)) {
    failures.push(`Fresh wallet mode must not introduce banned claim: ${banned}`);
  }
}

if (failures.length > 0) {
  console.error("vanta fresh wallet mode check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("vanta fresh wallet mode check: PASS");
