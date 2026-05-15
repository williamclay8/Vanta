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
      readFirst="Shield selected stablecoins into Vanta to start private lanes. Verify the receipt."
      badge={page.badge}
      nextStep={page.nextStep}
    >
      <section className="docs-page-section">
        <h2>What Vanta Portal is</h2>
        <p>
          Shield now. Use current private lanes. Verify the receipt. Lanes stay constrained until production gates clear.
        </p>
      </section>

      <section className="docs-page-section">
        <h2>How the system path works</h2>
        <div className="docs-step-grid" aria-label="Portal flow">
          <article className="docs-step-card">
            <span>1</span>
            <strong>Shield</strong>
            <p>
              Move selected stablecoins from a public wallet into Vanta&apos;s
              private state. This is the privacy entry point.
            </p>
          </article>
          <article className="docs-step-card">
            <span>2</span>
            <strong>Use a current lane</strong>
            <p>
              Use the private actions Vanta currently exposes. The goal is to
              settle without turning every product step into an ordinary public
              account trail.
            </p>
          </article>
          <article className="docs-step-card">
            <span>3</span>
            <strong>Receipt or exit</strong>
            <p>
              Share the trust packet when another party needs confidence, or
              unshield back to a public destination when the user wants to leave
              Vanta&apos;s private area.
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
            Vanta for privacy, use current private lanes, then produce a
            receipt or unshield back out when needed. That is easier to trust
            than vague privacy claims.
          </p>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Current status</h2>
        <ul className="docs-bullet-list">
          <li>Portal explains real product lanes, but those lanes are still intentionally narrow.</li>
          <li>Shield, send, swap, and unshield are not all equally mature yet.</li>
          <li>These docs do not claim production readiness, broad asset support, anonymous payments, or final privacy guarantees.</li>
        </ul>
      </section>
    </DocsPageTemplate>
  );
}
