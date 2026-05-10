import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const appSource = readFileSync(resolve(repoRoot, "src/App.tsx"), "utf8");
const productRootPath = resolve(repoRoot, "src/ProductAppRoot.tsx");
assert(
  existsSync(productRootPath),
  "src/ProductAppRoot.tsx must isolate the /app shell and wallet dependencies.",
);
const productRootSource = readFileSync(productRootPath, "utf8");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

const staticAppPageImports = [
  "@/pages/ActualPrivateSettlementPage",
  "@/pages/AppDashboardPage",
  "@/pages/LaunchPage",
  "@/pages/PayPage",
  "@/pages/PrivacyReviewPage",
  "@/pages/SendPage",
  "@/pages/ShieldPage",
  "@/pages/StrategyPage",
  "@/pages/SwapPage",
  "@/pages/UnshieldPage",
];

for (const staticImport of staticAppPageImports) {
  assert(
    !appSource.includes(`from "${staticImport}"`),
    `App.tsx must lazy-load ${staticImport} instead of statically importing it.`,
  );
  assert(
    appSource.includes(`import("${staticImport}")`),
    `App.tsx must keep an explicit lazy import for ${staticImport}.`,
  );
}

for (const heavyRootImport of [
  "@solana/react-hooks",
  "@solana/client",
  "@/components/AppLayout",
  "@/data/context/PrivateVaultContext",
  "@/data/context/PrivacyFlowContext",
  "@/data/context/WalletContext",
  "@/solana/client",
]) {
  assert(
    !appSource.includes(`from "${heavyRootImport}"`),
    `App.tsx must not statically import app-shell dependency ${heavyRootImport}.`,
  );
  assert(
    productRootSource.includes(`from "${heavyRootImport}"`),
    `ProductAppRoot.tsx must own app-shell dependency ${heavyRootImport}.`,
  );
}

assert(
  appSource.includes("const ProductAppRoot = lazy(") &&
    appSource.includes('import("@/ProductAppRoot")'),
  "App.tsx must lazy-load ProductAppRoot behind the /app route.",
);
assert(
  packageJson.scripts?.["performance:route-code-split-check"] ===
    "node scripts/check-vanta-route-code-split.mjs",
  "package.json must expose performance:route-code-split-check.",
);

console.log("Vanta route code-split contract: PASS");
