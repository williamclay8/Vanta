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
    title: "Private Send",
    status: "Private Core lane",
    summary: "Move value privately.",
    details: "Proof-backed where implemented; production privacy claims remain gated.",
  },
  {
    title: "Private Swap",
    status: "Next",
    summary: "Trade from shielded state.",
    details: "Constrained today, broader later.",
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
    title: "Shield + Private Send",
    description: "Today’s private-core lane.",
  },
  {
    phase: "Phase 02",
    title: "Private Swap",
    description: "Private execution from shielded state.",
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
