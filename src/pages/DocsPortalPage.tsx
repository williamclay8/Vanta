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
      badge={page.badge}
      nextStep={page.nextStep}
    >
      <section className="docs-page-section">
        <h2>What Vanta Portal is</h2>
        <p>
          Vanta Portal is the wallet side of the product. It shows how a user
          can move supported assets out of an ordinary public wallet flow and
          into Vanta&apos;s private area before using the private actions Vanta
          supports today.
        </p>
        <p>
          The plain version: a normal wallet is public. Vanta privacy starts
          only after supported assets are shielded into Vanta. From there, the
          app can support private send, swap, and exit paths as those lanes
          become real.
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
          <strong>Portal is the clearest mental model for Vanta.</strong>
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
