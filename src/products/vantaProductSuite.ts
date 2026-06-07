export type VantaProductSlug =
  | "compliance-gateway"
  | "private-perps-engine"
  | "shielded-rwa-tokenization"
  | "privacy-sdk-primitives-marketplace"
  | "private-velocity-intelligence";

export type VantaProductSurface = {
  appRoute: string;
  blockedClaims: string[];
  capabilities: string[];
  counterparty: string;
  eyebrow: string;
  name: string;
  proofLane: string;
  publicPacket: string;
  route: string;
  slug: VantaProductSlug;
  status: string;
  summary: string;
  verificationCommand: string;
};

export const vantaProductSuite: VantaProductSurface[] = [
  {
    appRoute: "/app/pay",
    blockedClaims: [
      "Production privacy is not enabled.",
      "No regulator approval or audit acceptance claim.",
      "No proof bytes are exposed on public receipts.",
    ],
    capabilities: [
      "Selective facts such as amount threshold and jurisdiction match",
      "Verifier-local opening stub separated from the public packet",
      "Pay receipt summary with proof material held out",
    ],
    counterparty: "Merchant, reviewer, or finance operator checking only the facts needed for a payment decision.",
    eyebrow: "Selective disclosure",
    name: "Compliance Gateway",
    proofLane: "Noir selective-disclosure adapter metadata is wired; generated proof execution remains claim-blocked.",
    publicPacket: "Redacted Compliance Gateway summary attached to Pay institutional receipt surfaces.",
    route: "/products/compliance-gateway",
    slug: "compliance-gateway",
    status: "Beta product surface",
    summary:
      "A policy-safe disclosure path for proving selected payment facts without publishing raw settlement details.",
    verificationCommand: "npm run compliance:gateway-check",
  },
  {
    appRoute: "/app/pay",
    blockedClaims: [
      "No production derivatives venue claim.",
      "No live private derivatives settlement claim.",
      "No mainnet readiness claim.",
    ],
    capabilities: [
      "Private position commitment with public leverage metadata",
      "Nullifier-backed update path for private state transitions",
      "Liquidation predicate packets that do not publish notional or owner data",
    ],
    counterparty: "Risk reviewer or settlement operator checking a position packet and liquidation predicate.",
    eyebrow: "Private positions",
    name: "Private Perps Engine",
    proofLane: "Proof-result adapter shape is claim-blocked until circuit artifacts and runtime proving are ready.",
    publicPacket: "Redacted private-perps position packet with settlement hook into Pay and Private Pool v2.",
    route: "/products/private-perps-engine",
    slug: "private-perps-engine",
    status: "Functional MVP gate",
    summary:
      "A private position engine prototype for committed position state, private updates, and visible risk predicates.",
    verificationCommand: "npm run private-perps:check",
  },
  {
    appRoute: "/app/pay",
    blockedClaims: [
      "No production tokenization claim.",
      "No custody, compliance, or regulator approval claim.",
      "No mainnet asset-readiness claim.",
    ],
    capabilities: [
      "RWA issuance commitment with owner and amount hidden",
      "Private ownership proof packet",
      "Selective facts for accreditation, threshold, or jurisdiction review",
    ],
    counterparty: "Asset issuer, reviewer, or buyer checking enough facts to trust a private RWA flow.",
    eyebrow: "Private asset packets",
    name: "Shielded RWA Tokenization",
    proofLane: "Reusable RWA module is wired to SDK primitives; real proof generation remains blocked.",
    publicPacket: "Shielded RWA public packet with ownership and selective-disclosure summaries.",
    route: "/products/shielded-rwa-tokenization",
    slug: "shielded-rwa-tokenization",
    status: "Functional MVP gate",
    summary:
      "A reusable RWA packet flow for private issuance, ownership proof, selective disclosure, and settlement hooks.",
    verificationCommand: "npm run shielded-rwa:check",
  },
  {
    appRoute: "/app/proof",
    blockedClaims: [
      "No audited primitives claim.",
      "No production SDK readiness claim.",
      "No generated-proof claim lift.",
    ],
    capabilities: [
      "Commitment, nullifier, selective-disclosure, settlement, velocity, and predicate-composer primitives",
      "Marketplace metadata for primitive acquisition and reuse",
      "Public packet helpers separated from private witness material",
    ],
    counterparty: "Builder or internal product team composing private receipts and proof request packets.",
    eyebrow: "Reusable primitives",
    name: "Privacy SDK & Primitives Marketplace",
    proofLane: "Product proof-request and proof-result adapters are wired as witnessless public packets.",
    publicPacket: "SDK-composed public packets for RWA, perps, velocity, and settlement stubs.",
    route: "/products/privacy-sdk-primitives-marketplace",
    slug: "privacy-sdk-primitives-marketplace",
    status: "Functional MVP gate",
    summary:
      "The reusable primitive layer that lets Vanta products compose commitments, nullifiers, disclosures, and receipt packets.",
    verificationCommand: "npm run privacy-sdk:check",
  },
  {
    appRoute: "/app/proof",
    blockedClaims: [
      "No production analytics claim.",
      "No off-record activity or surveillance-evasion claim.",
      "No mainnet settlement-readiness claim.",
    ],
    capabilities: [
      "Private aggregate commitment over hidden volumes",
      "Threshold predicates for institutional velocity facts",
      "Redacted dashboard packet with compliance facts and nullifier rollover",
    ],
    counterparty: "Institutional reviewer checking aggregate activity predicates without seeing raw volumes.",
    eyebrow: "Private aggregate facts",
    name: "Private Velocity Intelligence",
    proofLane: "Noir velocity aggregate adapter metadata is wired; browser proof execution remains blocked.",
    publicPacket: "Redacted velocity dashboard and proof-result packet with private inputs withheld.",
    route: "/products/private-velocity-intelligence",
    slug: "private-velocity-intelligence",
    status: "Functional MVP gate",
    summary:
      "A private analytics surface for proving aggregate thresholds and compliance facts without publishing exact flow data.",
    verificationCommand: "npm run velocity-intelligence:check",
  },
];

export function getVantaProductSurface(slug: string | undefined) {
  const normalizedSlug =
    slug === "privacy-sdk-marketplace" ? "privacy-sdk-primitives-marketplace" : slug;

  return vantaProductSuite.find((surface) => surface.slug === normalizedSlug);
}
