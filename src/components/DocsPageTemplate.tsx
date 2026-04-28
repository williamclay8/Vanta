import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { DocsStatusBadge } from "@/components/DocsStatusBadge";
import type { DocsBadge, DocsPageMeta } from "@/docs/docsContent";

type DocsNextStep = NonNullable<DocsPageMeta["nextStep"]>;

type DocsPageTemplateProps = {
  title: string;
  summary: string;
  readFirst?: string;
  badge?: DocsBadge;
  children: ReactNode;
  nextStep?: DocsNextStep;
};

export function DocsPageTemplate({
  title,
  summary,
  readFirst,
  badge,
  children,
  nextStep,
}: DocsPageTemplateProps) {
  return (
    <article className="docs-page">
      <header className="docs-page__header product-intro">
        {badge ? <DocsStatusBadge badge={badge} /> : null}
        <div className="docs-page__intro">
          <span className="docs-page__eyebrow product-intro__eyebrow">Vanta Docs</span>
          <h1>{title}</h1>
          <p>{summary}</p>
        </div>
      </header>
      <section className="docs-page__read-first" data-docs-read-first>
        <span>Start here</span>
        <p>{readFirst ?? summary}</p>
      </section>
      <div className="docs-page__body">{children}</div>
      {nextStep ? (
        <footer className="docs-page__next">
          <span>Next step</span>
          <Link to={nextStep.href}>{nextStep.label}</Link>
          <p>{nextStep.description}</p>
        </footer>
      ) : null}
    </article>
  );
}
