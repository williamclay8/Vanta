export type Capability = {
  title: string;
  status: string;
  summary: string;
  details: string;
};

export const capabilities: Capability[] = [
  {
    title: "Shield",
    status: "Live / MVP",
    summary: "Enter private state.",
    details: "The first step for every private workflow in Vanta.",
  },
  {
    title: "Private Send",
    status: "Live",
    summary: "Move value privately.",
    details: "The first live action built on shielded balances.",
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

export const tractionPricing = {
  headline: "0 monthly fee",
  rate: "0.25% only when a supported action completes successfully.",
  passThrough:
    "Network, off-ramp, and third-party execution costs are shown separately when they apply.",
  tokenRoadmap:
    "$VANTA is utility-first. Any later buyback policy should use a defined share of Vanta-collected net transaction fees.",
} as const;
