import { DocsPageTemplate } from "@/components/DocsPageTemplate";
import { getDocsPageMeta } from "@/docs/docsContent";

export function DocsPortalPage() {
  const page = getDocsPageMeta("portal");

  if (!page) {
    return null;
  }

  return (
    <DocsPageTemplate
      title={page.title}
      summary={page.summary}
      readFirst="Vanta privacy starts when supported assets are shielded into Vanta. Before that, a normal Solana wallet is still public."
      badge={page.badge}
      nextStep={page.nextStep}
    >
      <section className="docs-page-section">
        <h2>What Vanta Portal is</h2>
        <p>
          Vanta Portal is the wallet side of the product. It helps a user move
          supported assets out of a public wallet trail and into Vanta before
          using supported private actions.
        </p>
        <p>
          The plain version: a normal wallet is public. Vanta starts after a
          shield action. From there, the app can support gated private actions;
          Swap remains constrained until its production-status blockers clear.
        </p>
      </section>

      <section className="docs-page-section">
        <h2>How the system path works</h2>
        <div className="docs-step-grid" aria-label="Portal flow">
          <article className="docs-step-card">
            <span>1</span>
            <strong>Shield</strong>
            <p>
              Move supported assets from a public wallet into Vanta&apos;s private
              area. This is the privacy entry point.
            </p>
          </article>
          <article className="docs-step-card">
            <span>2</span>
            <strong>Use private flows</strong>
            <p>
              Use the private actions Vanta currently supports. The point is to
              avoid turning every product step into an ordinary public account
              trail.
            </p>
          </article>
          <article className="docs-step-card">
            <span>3</span>
            <strong>Unshield when needed</strong>
            <p>
              Move assets back to a public destination when the user wants to
              leave Vanta&apos;s private area.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Why it matters</h2>
        <div className="docs-callout">
          <strong>Portal is useful because it gives privacy a clear start and end.</strong>
          <p>
            It gives users a simple rule: public wallet first, shield into
            Vanta for privacy, use supported private actions, then unshield back
            out when needed. That is easier to trust than vague privacy claims.
          </p>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Current status</h2>
        <ul className="docs-bullet-list">
          <li>Portal explains real product lanes, but those lanes are still intentionally narrow.</li>
          <li>Shield, send, swap, and unshield are not all equally mature yet.</li>
          <li>These docs do not claim production readiness, broad asset support, or final privacy guarantees.</li>
        </ul>
      </section>
    </DocsPageTemplate>
  );
}
