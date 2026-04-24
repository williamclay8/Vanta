import type { CSSProperties } from "react";
import type { DocsBadge } from "@/docs/docsContent";

const badgeLabel: Record<DocsBadge, string> = {
  "live-now": "Live now",
  preview: "Preview",
  "design-partner-surface": "Design-partner surface",
  "forward-looking": "Forward-looking",
};

const badgeStyle: Record<DocsBadge, CSSProperties> = {
  "live-now": {
    background: "rgba(16, 185, 129, 0.16)",
    borderColor: "rgba(16, 185, 129, 0.4)",
    color: "#a7f3d0",
  },
  preview: {
    background: "rgba(56, 189, 248, 0.14)",
    borderColor: "rgba(56, 189, 248, 0.4)",
    color: "#bae6fd",
  },
  "design-partner-surface": {
    background: "rgba(251, 191, 36, 0.14)",
    borderColor: "rgba(251, 191, 36, 0.34)",
    color: "#fde68a",
  },
  "forward-looking": {
    background: "rgba(244, 114, 182, 0.14)",
    borderColor: "rgba(244, 114, 182, 0.34)",
    color: "#fbcfe8",
  },
};

export function DocsStatusBadge({ badge }: { badge: DocsBadge }) {
  return (
    <span
      data-docs-badge={badge}
      style={{
        display: "inline-flex",
        width: "fit-content",
        alignItems: "center",
        border: "1px solid transparent",
        borderRadius: "999px",
        padding: "0.4rem 0.75rem",
        fontSize: "0.8rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
        ...badgeStyle[badge],
      }}
    >
      {badgeLabel[badge]}
    </span>
  );
}
