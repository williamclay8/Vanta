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
    summary:
      "Move supported assets into the Vanta privacy layer and establish shielded state as the foundation for private actions.",
    details:
      "Shield establishes private state outside ordinary public wallet flows. It is the first entrypoint into Vanta and the foundation that makes Private Send, future swaps, and payment workflows technically coherent.",
  },
  {
    title: "Private Send",
    status: "Live",
    summary:
      "Use shielded balances to transfer value with far less public traceability than standard wallet-to-wallet flows.",
    details:
      "Private Send is the first action enabled by shielded state. Rather than standing alone, it completes the first credible privacy loop together with Shield.",
  },
  {
    title: "Private Swap",
    status: "Next",
    summary:
      "Exchange assets from shielded state through a future privacy-preserving swap workflow.",
    details:
      "Private Swap builds naturally on the same privacy layer, giving active users and treasury operators a cleaner execution surface once assets are already shielded.",
  },
  {
    title: "Private Pay",
    status: "Planned",
    summary:
      "Enable private payment and commerce experiences built on top of shielded balances.",
    details:
      "Payments should inherit Solana speed and cost efficiency without forcing customers, revenues, and treasury movements into public view.",
  },
  {
    title: "Private Launch",
    status: "Future",
    summary:
      "Explore future privacy-aware token and ecosystem workflows inside the broader Vanta network.",
    details:
      "Private launch is a roadmap surface for projects that want better defaults around visibility, participation, and ecosystem coordination as Vanta matures.",
  },
];

export const roadmap = [
  {
    phase: "Phase 01",
    title: "Shield + Private Send",
    description:
      "Current scope for Bags: a demoable Shield entrypoint plus Private Send workflow, showing the first complete privacy loop on Vanta with honest app shell boundaries.",
  },
  {
    phase: "Phase 02",
    title: "Private Swap",
    description:
      "Extend the privacy layer into execution with private swap flows, route abstraction, and trader-grade transaction context.",
  },
  {
    phase: "Phase 03",
    title: "Private Pay",
    description:
      "Add merchant-facing payment rails, settlement-aware interfaces, and the foundation for private onchain commerce.",
  },
  {
    phase: "Phase 04",
    title: "Vanta Network",
    description:
      "Expand into broader ecosystem infrastructure, privacy-aware network surfaces, and future coordination layers that support the product rather than define it.",
  },
];

export const audiences = [
  {
    label: "Developers",
    copy:
      "Composable privacy infrastructure, clean integration boundaries, and product surfaces that can grow into real protocol integrations.",
  },
  {
    label: "Traders",
    copy:
      "Reduced strategy leakage across transfers and swaps, without giving up the speed that makes Solana worth using.",
  },
  {
    label: "Commerce",
    copy:
      "A path to payment flows that respect customer, operator, and treasury privacy instead of exposing them by default.",
  },
];

export const howItWorks = [
  {
    label: "1. Shield",
    copy:
      "Move supported assets from public wallet state into the Vanta privacy layer.",
  },
  {
    label: "2. Hold",
    copy:
      "Maintain value in a shielded state rather than exposing every position and balance publicly.",
  },
  {
    label: "3. Use",
    copy:
      "Execute private workflows starting with send, and expanding into swap and payment flows over time.",
  },
  {
    label: "4. Exit",
    copy:
      "Unshield assets when you need to return to ordinary transparent Solana flows.",
  },
];

export const whyNow = [
  {
    label: "Solana is ready",
    copy:
      "Solana has the speed and cost profile for consumer and operator workflows, but its transparency is still too absolute for many real use cases.",
  },
  {
    label: "Commerce is coming onchain",
    copy:
      "As stablecoin payments, merchant tooling, and tokenized internet businesses move onchain, privacy becomes an operational requirement rather than a philosophical preference.",
  },
  {
    label: "Bags fit",
    copy:
      "For a Bags hackathon audience, Vanta is easy to judge as a serious product direction: a focused MVP today, a credible expansion path tomorrow, and clear relevance to Solana ecosystems and commerce.",
  },
];
