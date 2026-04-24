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
  "shared-truth": "Shared truth",
};

export const docsPages: DocsPageMeta[] = [
  {
    slug: "/docs",
    title: "Vanta Docs",
    summary:
      "Start here to understand what Vanta is, why it is useful, what works today, and what is still unfinished.",
    track: "shared",
    section: "home",
    badge: "design-partner-surface",
    navigation: {
      sidebarGroup: "start-here",
    },
    nextStep: {
      label: "Start with Vanta Portal",
      href: "/docs/portal",
      description: "See the crypto-native path into private state.",
    },
  },
  {
    slug: "/docs/portal",
    title: "Vanta Portal",
    summary:
      "Portal is the wallet path: shield supported assets into Vanta, use supported private actions, and unshield when needed.",
    track: "portal",
    section: "portal",
    badge: "preview",
    navigation: {
      sidebarGroup: "start-here",
      topNavLabel: "Portal",
    },
    nextStep: {
      label: "See how Vanta Pay builds on Portal",
      href: "/docs/pay",
      description: "Follow the merchant-facing settlement story.",
    },
  },
  {
    slug: "/docs/pay",
    title: "Vanta Pay",
    summary:
      "Pay is the merchant preview: payment requests, checkout, settlement status, refunds, withdrawals, and receipts in plain business language.",
    track: "pay",
    section: "pay",
    badge: "forward-looking",
    navigation: {
      sidebarGroup: "start-here",
      topNavLabel: "Pay",
    },
    nextStep: {
      label: "Review trust surfaces",
      href: "/docs/trust",
      description:
        "See approval boundaries, operator truth, and verification commands.",
    },
  },
  {
    slug: "/docs/trust",
    title: "Trust",
    summary:
      "Trust means the product says plainly what is live, what is a preview, who approves each step, and what commands prove it.",
    track: "shared",
    section: "trust",
    badge: "live-now",
    navigation: {
      sidebarGroup: "shared-truth",
      topNavLabel: "Trust",
    },
    nextStep: {
      label: "Read the security limits",
      href: "/docs/security",
      description: "Keep the current privacy and readiness constraints in view.",
    },
  },
  {
    slug: "/docs/security",
    title: "Security",
    summary:
      "Security explains the current limits in normal language, including why Vanta is not production-ready yet.",
    track: "shared",
    section: "security",
    badge: "live-now",
    navigation: {
      sidebarGroup: "shared-truth",
      topNavLabel: "Security",
    },
    nextStep: {
      label: "See the shared roadmap",
      href: "/docs/roadmap",
      description: "Follow how Portal and Pay connect in the roadmap.",
    },
  },
  {
    slug: "/docs/roadmap",
    title: "Roadmap",
    summary:
      "The roadmap shows how today's wallet and merchant previews can grow into the larger Vanta system without pretending it is finished.",
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
