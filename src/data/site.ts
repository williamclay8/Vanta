export type Capability = {
  title: string;
  status: string;
  summary: string;
  details: string;
};

export const capabilities: Capability[] = [
  {
    title: "Shield",
    status: "Beta",
    summary: "Shield funds. Start private settlement.",
    details: "Commit shielded state. Receive verifiable receipt.",
  },
  {
    title: "Shielded Send",
    status: "Beta",
    summary: "Send shielded funds and share a verifiable receipt.",
    details: "Proof-shaped lanes with operator-visible settlement (beta receipts ready to verify).",
  },
  {
    title: "Swap",
    status: "Beta",
    summary: "Swap shielded assets and receive operator-verifiable settlement proof.",
    details: "Operator-visible rails today; full private rebalance after readiness gates.",
  },
  {
    title: "Pay",
    status: "Preview",
    summary: "Pay merchants privately and deliver a receipt they can verify.",
    details: "Merchant-first private stablecoin settlement (receipt-backed test flows available).",
  },
  {
    title: "Launch",
    status: "Roadmap",
    summary: "Future network privacy rails for merchants.",
    details: "Broader private settlement infrastructure after current lanes prove the receipt loop.",
  },
];

export const roadmap = [
  {
    phase: "Phase 01",
    title: "Shield + guarded Send",
    description: "Today’s private-core beta lane.",
  },
  {
    phase: "Phase 02",
    title: "Programmatic Swap",
    description: "Private execution from shielded state after route contracts, verifier evidence, and custody gates are ready.",
  },
  {
    phase: "Phase 03",
    title: "Private Pay",
    description: "Payments and commerce rails.",
  },
  {
    phase: "Phase 04",
    title: "Vanta Network",
    description: "Broader privacy infrastructure.",
  },
];
