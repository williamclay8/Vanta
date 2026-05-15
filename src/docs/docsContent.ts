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
    summary: "Shield stablecoins. Use lanes. Produce verifiable receipts.",
    track: "shared",
    section: "home",
    badge: "design-partner-surface",
    navigation: {
      sidebarGroup: "start-here",
    },
    nextStep: {
      label: "Shield in Portal",
      href: "/docs/portal",
      description: "Shield flows. Verify receipt.",
    },
  },
  {
    slug: "/docs/portal",
    title: "Vanta Portal",
    summary: "Shield into Vanta. Use lanes. Unshield or verify receipt.",
    track: "portal",
    section: "portal",
    badge: "preview",
    navigation: {
      sidebarGroup: "start-here",
      topNavLabel: "Portal",
    },
    nextStep: {
      label: "Test checkout",
      href: "/docs/pay",
      description: "Check Pay lanes and operator status.",
    },
  },
  {
    slug: "/docs/pay",
    title: "Vanta Pay",
    summary: "Test checkout. Inspect settlement. Verify receipt records.",
    track: "pay",
    section: "pay",
    badge: "forward-looking",
    navigation: {
      sidebarGroup: "start-here",
      topNavLabel: "Pay",
    },
    nextStep: {
      label: "Inspect trust",
      href: "/docs/trust",
      description: "View receipts, operator status, verification.",
    },
  },
  {
    slug: "/docs/trust",
    title: "Trust",
    summary: "Verify actions, privacy, and receipt checks. Spot preview limits.",
    track: "shared",
    section: "trust",
    badge: "live-now",
    navigation: {
      sidebarGroup: "shared-truth",
      topNavLabel: "Trust",
    },
    nextStep: {
      label: "Check security",
      href: "/docs/security",
      description: "Review beta limits and verification commands.",
    },
  },
  {
    slug: "/docs/security",
    title: "Security",
    summary: "Privacy is beta. Check limits and verification commands.",
    track: "shared",
    section: "security",
    badge: "live-now",
    navigation: {
      sidebarGroup: "shared-truth",
      topNavLabel: "Security",
    },
    nextStep: {
      label: "See roadmap",
      href: "/docs/roadmap",
      description: "How Portal and Pay connect via receipts.",
    },
  },
  {
    slug: "/docs/roadmap",
    title: "Roadmap",
    summary: "Merchant path from preview lanes to verified settlement.",
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
