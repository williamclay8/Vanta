import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

const VERSION = "vanta-wallet-manager-0.1";
const DEFAULT_REGISTRY_PATH = `${homedir()}/.config/vanta/wallet-manager.json`;
const MAINNET_RPC_URL = process.env.SOLANA_MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com";
const MAINNET_RPC_URL = process.env.SOLANA_MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com";

const KNOWN_WALLETS = [
  {
    id: "mainnet-spend-program-deployer",
    cluster: "mainnet-beta",
    role: "spend-program-deployer",
    publicKey: "BRS1kUKTdV6hjrCyEQ1KUMML3h6Jv1nToe5oqQj8gyYY",
    keypairPath: `${homedir()}/.config/solana/vanta-mainnet-spend-program-deployer.json`,
    fundingPolicy: "deploy-only",
    notes: "Dedicated mainnet spend-program deployer. Do not use as relayer or app wallet.",
  },
  {
    id: "mainnet-spend-program-id",
    cluster: "mainnet-beta",
    role: "spend-program-id",
    publicKey: "1ANmqk7YB17FxaJLnvUthY9R4UZHyJuNt1cmNfpMsgm",
    keypairPath: `${homedir()}/.config/solana/vanta-mainnet-spend-program-id.json`,
    fundingPolicy: "program-id-signer-only",
    notes: "Dedicated mainnet spend-program id keypair. Use as --program-id signer for deploy; not a fee payer.",
  },
  {
    id: "mainnet-relayer-fee-payer",
    cluster: "mainnet-beta",
    role: "relayer-fee-payer",
    publicKey: "5pzJsEVARN5Ly6H1AjbbVofY6Fjr68FbkT6y8ozx3Ymi",
    keypairPath: `${homedir()}/.config/solana/vanta-mainnet-relayer-fee-payer.json`,
    fundingPolicy: "init-and-one-settlement-only",
    notes: "Production relayer fee payer. Keep separate from deploy authority unless explicitly approved.",
  },
  {
    id: "mainnet-cli-wallet",
    cluster: "mainnet-beta",
    role: "developer-mainnet-cli",
    publicKey: "Bg3SzSnz7tr8SF6DDtxMFoRStxPiQxptf3zvRJ7TkF6H",
    keypairPath: `${homedir()}/.config/solana/id.json`,
    fundingPolicy: "mainnet-only",
    notes: "Default CLI mainnet wallet. Do not use for mainnet production operations.",
  },
];

const command = process.argv[2] || "list";

if (command === "init") {
  const registry = buildRegistry();
  saveRegistry(registry);
  console.log(JSON.stringify(sanitizeRegistry(registry), null, 2));
} else if (command === "list") {
  const registry = loadOrBuildRegistry();
  console.log(JSON.stringify(sanitizeRegistry(registry), null, 2));
} else if (command === "balances") {
  const registry = loadOrBuildRegistry();
  const withBalances = await attachBalances(registry);
  console.log(JSON.stringify(sanitizeRegistry(withBalances), null, 2));
} else if (command === "check") {
  const registry = loadOrBuildRegistry();
  checkRegistry(registry);
  console.log("Vanta wallet manager check: PASS");
} else if (command === "export-env") {
  const id = process.argv[3] || "";
  const registry = loadOrBuildRegistry();
  checkRegistry(registry);
  const wallet = registry.wallets.find((entry) => entry.id === id);
  if (!wallet) {
    throw new Error(`Unknown wallet id ${id}.`);
  }
  console.log(`export VANTA_WALLET_ID='${shellQuote(wallet.id)}'`);
  console.log(`export VANTA_WALLET_PUBLIC_KEY='${shellQuote(wallet.publicKey)}'`);
  console.log(`export VANTA_WALLET_KEYPAIR_PATH='${shellQuote(wallet.keypairPath)}'`);
} else {
  throw new Error(`Unknown wallet manager command ${command}. Use init, list, balances, check, or export-env.`);
}

function buildRegistry() {
  return {
    version: VERSION,
    secretPolicy: "refs-only-no-private-key-bytes",
    registryPath: DEFAULT_REGISTRY_PATH,
    updatedAt: new Date().toISOString(),
    wallets: KNOWN_WALLETS.map((wallet) => ({
      ...wallet,
      keypairPath: resolve(wallet.keypairPath),
    })),
  };
}

function loadOrBuildRegistry() {
  if (!existsSync(DEFAULT_REGISTRY_PATH)) {
    const registry = buildRegistry();
    saveRegistry(registry);
    return registry;
  }

  const registry = JSON.parse(readFileSync(DEFAULT_REGISTRY_PATH, "utf8"));
  return {
    ...registry,
    wallets: registry.wallets.map((wallet) => ({
      ...wallet,
      keypairPath: resolve(wallet.keypairPath),
    })),
  };
}

function saveRegistry(registry) {
  mkdirSync(dirname(DEFAULT_REGISTRY_PATH), { recursive: true, mode: 0o700 });
  writeFileSync(DEFAULT_REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, { mode: 0o600 });
}

function checkRegistry(registry) {
  if (registry.version !== VERSION) {
    throw new Error(`Unexpected wallet manager version ${registry.version}.`);
  }
  if (registry.secretPolicy !== "refs-only-no-private-key-bytes") {
    throw new Error("Wallet manager registry must be refs-only.");
  }
  assertNoRawSecretFields(registry, "registry");

  for (const wallet of registry.wallets) {
    new PublicKey(wallet.publicKey);
    if (!existsSync(wallet.keypairPath)) {
      throw new Error(`${wallet.id} keypair path does not exist: ${wallet.keypairPath}`);
    }
    const mode = statSync(wallet.keypairPath).mode & 0o777;
    if ((mode & 0o077) !== 0) {
      throw new Error(`${wallet.id} keypair file must not be group/world readable: ${wallet.keypairPath}`);
    }
    const keypair = loadKeypair(wallet.keypairPath);
    if (keypair.publicKey.toBase58() !== wallet.publicKey) {
      throw new Error(`${wallet.id} keypair does not derive expected public key.`);
    }
  }
}

async function attachBalances(registry) {
  checkRegistry(registry);
  const connections = {
    "mainnet-beta": new Connection(MAINNET_RPC_URL, "confirmed"),
    mainnet: new Connection(MAINNET_RPC_URL, "confirmed"),
  };

  const wallets = [];
  for (const wallet of registry.wallets) {
    const connection = connections[wallet.cluster];
    const lamports = await connection.getBalance(new PublicKey(wallet.publicKey), "confirmed");
    wallets.push({
      ...wallet,
      balance: {
        lamports,
        sol: lamports / LAMPORTS_PER_SOL,
      },
    });
  }

  return {
    ...registry,
    updatedAt: new Date().toISOString(),
    wallets,
  };
}

function sanitizeRegistry(registry) {
  return {
    ...registry,
    wallets: registry.wallets.map((wallet) => ({
      id: wallet.id,
      cluster: wallet.cluster,
      role: wallet.role,
      publicKey: wallet.publicKey,
      keypairPath: wallet.keypairPath,
      fundingPolicy: wallet.fundingPolicy,
      notes: wallet.notes,
      balance: wallet.balance,
    })),
  };
}

function loadKeypair(path) {
  const value = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(value)) {
    throw new Error(`${path} must contain a Solana keypair JSON byte array.`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(value));
}

function assertNoRawSecretFields(value, path) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      assertNoRawSecretFields(value[index], `${path}[${index}]`);
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (["privateKey", "secretKey", "secret", "keypair", "mnemonic", "seedPhrase", "rawSecret"].includes(key)) {
      throw new Error(`Wallet manager registry must not contain raw secret field ${path}.${key}.`);
    }
    assertNoRawSecretFields(child, `${path}.${key}`);
  }
}

function shellQuote(value) {
  return String(value).replaceAll("'", "'\\''");
}
