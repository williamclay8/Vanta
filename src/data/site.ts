export type Capability = {
  title: string;
  status: string;
  summary: string;
  details: string;
};

export const capabilities: Capability[] = [
  {
    title: "Shield",
    status: "Beta lane",
    summary: "Enter private state.",
    details: "The constrained entry point for current private-core flows.",
  },
  {
    title: "Shielded Send (beta)",
    status: "Private Core lane",
    summary: "Move from shielded state with claim gates visible.",
    details: "Proof-shaped where implemented; v2 AEAD memos reduce public-chain leakage while recipient discovery remains a blocker.",
  },
  {
    title: "Swap routing beta",
    status: "Target C beta",
    summary: "Route from shielded state with operator-visible settlement.",
    details: "Production privacy is not enabled for current routes; the private rebalance contract remains a future gate.",
  },
  {
    title: "Private Pay",
    status: "Planned",
    summary: "Pay without broadcasting the full graph.",
    details: "The next product lane after private movement.",
  },
  {
    title: "Private Launch",
    status: "Future",
    summary: "Future network-facing privacy rails.",
    details: "Longer-term ecosystem infrastructure.",
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
