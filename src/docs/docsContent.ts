export type DocsTrack = "portal" | "pay" | "shared";

export type DocsBadge =
  | "live-now"
  | "preview"
  | "design-partner-surface"
  | "forward-looking";

export type DocsSection =
  | "home"
  | "portal"
  | "pay"
  | "trust"
  | "security"
  | "roadmap";

export type DocsSidebarGroupId = "start-here" | "shared-truth";

export type DocsPageMeta = {
  slug: string;
  title: string;
  summary: string;
  track: DocsTrack;
  section: DocsSection;
  badge?: DocsBadge;
  navigation?: {
    sidebarGroup: DocsSidebarGroupId;
    topNavLabel?: string;
  };
  nextStep?: {
    label: string;
    href: string;
    description: string;
  };
};

export type DocsSidebarGroup = {
  id: DocsSidebarGroupId;
  label: string;
  pages: DocsPageMeta[];
};

const docsSidebarGroupLabels: Record<DocsSidebarGroupId, string> = {
  "start-here": "Start here",
  "shared-truth": "Verify & trust",
};

export const docsPages: DocsPageMeta[] = [
  {
    slug: "/docs",
    title: "Vanta Docs",
    summary:
      "Shield selected stablecoins, use current lanes, and produce a receipt the counterparty can verify.",
    track: "shared",
    section: "home",
    badge: "design-partner-surface",
    navigation: {
      sidebarGroup: "start-here",
    },
    nextStep: {
      label: "Shield now in Portal",
      href: "/docs/portal",
      description: "Shield selected flows and verify the receipt.",
    },
  },
  {
    slug: "/docs/portal",
    title: "Vanta Portal",
    summary:
      "Shield selected stablecoins into Vanta, use current private lanes, unshield when needed, and verify the receipt.",
    track: "portal",
    section: "portal",
    badge: "preview",
    navigation: {
      sidebarGroup: "start-here",
      topNavLabel: "Portal",
    },
    nextStep: {
      label: "Test merchant checkout",
      href: "/docs/pay",
      description: "See live lanes and operator status for Pay.",
    },
  },
  {
    slug: "/docs/pay",
    title: "Vanta Pay",
    summary:
      "Test checkout, inspect settlement status, issue refunds, and verify receipt-backed records in merchant language.",
    track: "pay",
    section: "pay",
    badge: "forward-looking",
    navigation: {
      sidebarGroup: "start-here",
      topNavLabel: "Pay",
    },
    nextStep: {
      label: "Inspect trust & receipts",
      href: "/docs/trust",
      description: "See live receipt, operator, and verification surfaces.",
    },
  },
  {
    slug: "/docs/trust",
    title: "Trust",
    summary:
      "Verify what happened, what stayed private, who can check the receipt, and what remains preview-only.",
    track: "shared",
    section: "trust",
    badge: "live-now",
    navigation: {
      sidebarGroup: "shared-truth",
      topNavLabel: "Trust",
    },
    nextStep: {
      label: "Check security limits",
      href: "/docs/security",
      description: "See current beta constraints and verification commands.",
    },
  },
  {
    slug: "/docs/security",
    title: "Security",
    summary:
      "Production privacy is not enabled. See current beta limits and verification commands.",
    track: "shared",
    section: "security",
    badge: "live-now",
    navigation: {
      sidebarGroup: "shared-truth",
      topNavLabel: "Security",
    },
    nextStep: {
      label: "Follow the roadmap",
      href: "/docs/roadmap",
      description: "See how Portal and Pay connect with receipt verification.",
    },
  },
  {
    slug: "/docs/roadmap",
    title: "Roadmap",
    summary:
      "See the merchant-first path from preview lanes to verified private settlement.",
    track: "shared",
    section: "roadmap",
    badge: "forward-looking",
    navigation: {
      sidebarGroup: "shared-truth",
      topNavLabel: "Roadmap",
    },
  },
];

export const docsPrimaryNavPages = docsPages.filter(
  (page): page is DocsPageMeta & { navigation: { sidebarGroup: DocsSidebarGroupId; topNavLabel: string } } =>
    typeof page.navigation?.topNavLabel === "string",
);

export const docsSidebarGroups: DocsSidebarGroup[] = (
  Object.keys(docsSidebarGroupLabels) as DocsSidebarGroupId[]
).map((groupId) => ({
  id: groupId,
  label: docsSidebarGroupLabels[groupId],
  pages: docsPages.filter((page) => page.navigation?.sidebarGroup === groupId),
}));

export function getDocsPageMeta(
  section: DocsSection,
): DocsPageMeta | undefined {
  return docsPages.find((page) => page.section === section);
}
