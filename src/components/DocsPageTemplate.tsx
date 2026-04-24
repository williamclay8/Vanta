import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { DocsStatusBadge } from "@/components/DocsStatusBadge";
import type { DocsBadge, DocsPageMeta } from "@/docs/docsContent";

type DocsNextStep = NonNullable<DocsPageMeta["nextStep"]>;

type DocsPageTemplateProps = {
  title: string;
  summary: string;
  badge?: DocsBadge;
  children: ReactNode;
  nextStep?: DocsNextStep;
};

export function DocsPageTemplate({
  title,
  summary,
  badge,
  children,
  nextStep,
}: DocsPageTemplateProps) {
  return (
    <article style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "grid", gap: "0.875rem" }}>
        {badge ? <DocsStatusBadge badge={badge} /> : null}
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <h1 style={{ margin: 0 }}>{title}</h1>
          <p
            style={{
              margin: 0,
              fontSize: "1.05rem",
              lineHeight: 1.7,
              color: "rgba(226, 232, 240, 0.88)",
            }}
          >
            {summary}
          </p>
        </div>
      </header>
      <div style={{ display: "grid", gap: "1.25rem" }}>{children}</div>
      {nextStep ? (
        <footer
          style={{
            borderTop: "1px solid rgba(148, 163, 184, 0.16)",
            paddingTop: "1rem",
            display: "grid",
            gap: "0.45rem",
          }}
        >
          <span
            style={{
              fontSize: "0.78rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(226, 232, 240, 0.72)",
            }}
          >
            Next step
          </span>
          <Link
            to={nextStep.href}
            style={{
              width: "fit-content",
              color: "#99f6e4",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {nextStep.label}
          </Link>
          <p style={{ margin: 0, color: "rgba(226, 232, 240, 0.8)" }}>
            {nextStep.description}
          </p>
        </footer>
      ) : null}
    </article>
  );
}
