import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const shieldPageSource = readFileSync(resolve(repoRoot, "src/pages/ShieldPage.tsx"), "utf8");
const sendPageSource = readFileSync(resolve(repoRoot, "src/pages/SendPage.tsx"), "utf8");
const sendWorkspaceSource = readFileSync(
  resolve(repoRoot, "src/components/SendWorkspaceCard.tsx"),
  "utf8",
);
const sendSurfaceSource = `${sendPageSource}\n${sendWorkspaceSource}`;
const unshieldPageSource = readFileSync(
  resolve(repoRoot, "src/pages/UnshieldPage.tsx"),
  "utf8",
);
const packageSource = readFileSync(resolve(repoRoot, "package.json"), "utf8");

const failures = [];

if (!shieldPageSource.includes('const [amount, setAmount] = useState("");')) {
  failures.push("Shield amount state must start empty so the input shows the 0.00 placeholder.");
}

if (!shieldPageSource.includes('placeholder="0.00"')) {
  failures.push("Shield amount input must keep the 0.00 placeholder.");
}

if (!sendPageSource.includes('const [amount, setAmount] = useState("");')) {
  failures.push("Send amount state must start empty so the input shows the 0.00 placeholder.");
}

if (!sendSurfaceSource.includes('placeholder="0.00"')) {
  failures.push("Send amount input must keep the 0.00 placeholder.");
}

if (sendPageSource.includes("setAmount(nextSelectedNote.amount.toFixed(2));")) {
  failures.push("Send must not auto-fill the first shielded note amount when notes load.");
}

if (!unshieldPageSource.includes('const [requestedAmountInput, setRequestedAmountInput] = useState("");')) {
  failures.push("Unshield amount state must start empty so the input shows the 0.00 placeholder.");
}

if (!unshieldPageSource.includes('selectedLane === "USDC"')) {
  failures.push("Unshield must preserve the USDC editable amount lane.");
}

if (
  unshieldPageSource.includes("setRequestedAmountInput(\n        selectedSolNote") ||
  unshieldPageSource.includes("setRequestedAmountInput(\n      selectedShieldNote")
) {
  failures.push("Unshield must not auto-fill the selected shielded note amount when notes load.");
}

if (shieldPageSource.includes('useState("0.25")') || shieldPageSource.includes('useState(".25")')) {
  failures.push("Shield must not seed the amount box with .25.");
}

if (!packageSource.includes('"protocol:amount-placeholders-check"')) {
  failures.push("package.json must expose protocol:amount-placeholders-check.");
}

if (failures.length > 0) {
  console.error("Vanta protocol amount placeholder check: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Vanta protocol amount placeholder check: PASS");
