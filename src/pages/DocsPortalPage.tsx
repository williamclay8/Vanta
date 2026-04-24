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
          Vanta Portal is the crypto-native side of Vanta. It explains how
          supported assets move from a public wallet into private state before
          users send, swap, or exit through the current narrow lanes.
        </p>
        <p>
          The key idea is simple: Vanta does not pretend a normal wallet balance
          is private by default. Privacy begins when assets are shielded into
          the supported private-state flow.
        </p>
      </section>

      <section className="docs-page-section">
        <h2>How the system path works</h2>
        <div className="docs-step-grid" aria-label="Portal flow">
          <article className="docs-step-card">
            <span>1</span>
            <strong>Shield</strong>
            <p>Move supported assets from a public wallet into private state.</p>
          </article>
          <article className="docs-step-card">
            <span>2</span>
            <strong>Use private flows</strong>
            <p>
              Send or swap from shielded state without exposing every product
              step in the same way as a public account flow.
            </p>
          </article>
          <article className="docs-step-card">
            <span>3</span>
            <strong>Unshield when needed</strong>
            <p>
              Exit back to a public destination when the user wants to leave the
              private-state side of the system.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Why it matters</h2>
        <div className="docs-callout">
          <strong>Portal is the clearest mental model for Vanta.</strong>
          <p>
            It gives users a crypto-native explanation for privacy without
            hiding the mechanics behind magical claims. Shielded state is the
            starting point, not a detail buried in the footer.
          </p>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Current status</h2>
        <ul className="docs-bullet-list">
          <li>Portal is a preview-facing docs surface built around constrained product lanes.</li>
          <li>Shield, send, swap, and unshield do not all share the same maturity or verification depth yet.</li>
          <li>These docs do not claim production readiness, broad asset support, or final privacy guarantees.</li>
        </ul>
      </section>
    </DocsPageTemplate>
  );
}
