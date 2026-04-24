import {
  VANTA_PRICING_CONTRACT,
  VANTA_PRICING_COPY,
} from "../pricing/vantaPricing";

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
  | "pricing"
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

const docsPricingSummary = `Vanta's launch-stage pricing direction is simple: 0 monthly fee, ${VANTA_PRICING_CONTRACT.successFeeRateDisplay} only when a supported action completes successfully, and ${VANTA_PRICING_COPY.passThrough.toLowerCase()}`;

export const docsPages: DocsPageMeta[] = [
  {
    slug: "/docs",
    title: "Vanta Docs",
    summary:
      "A simple guide to Vanta's private-state system, product paths, and trust surfaces.",
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
      "Enter private state, move through crypto-native flows, and understand how Vanta starts from shielded state instead of public balances.",
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
      "The forward-looking merchant settlement direction, with today's demo and control-plane surfaces labeled clearly and honestly.",
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
      "Trust in Vanta comes from clear approval boundaries, operator-visible truth, and verification surfaces that stay aligned with the product story.",
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
      "Security explains the privacy model Vanta uses today, the limits that still matter, and why the product is not yet production-ready.",
    track: "shared",
    section: "security",
    badge: "live-now",
    navigation: {
      sidebarGroup: "shared-truth",
      topNavLabel: "Security",
    },
    nextStep: {
      label: "See pricing direction",
      href: "/docs/pricing",
      description: "Understand how the launch package is framed for early users.",
    },
  },
  {
    slug: "/docs/pricing",
    title: "Pricing",
    summary: docsPricingSummary,
    track: "shared",
    section: "pricing",
    badge: "design-partner-surface",
    navigation: {
      sidebarGroup: "shared-truth",
      topNavLabel: "Pricing",
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
      "The roadmap connects today's Portal foundations to the merchant-first Pay direction without pretending the final network already exists.",
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
