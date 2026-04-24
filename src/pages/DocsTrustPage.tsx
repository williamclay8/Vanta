import { DocsPageTemplate } from "@/components/DocsPageTemplate";
import { getDocsPageMeta } from "@/docs/docsContent";

export function DocsTrustPage() {
  const page = getDocsPageMeta("trust");

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
        <h2>Approval boundaries</h2>
        <p>
          Vanta treats trust as something readers should be able to inspect.
          When a step needs a user decision, operator review, or execution
          approval, the product should say so plainly instead of hiding that
          boundary behind marketing language.
        </p>
        <p>
          That is why the docs keep preview surfaces, design-partner flows, and
          live execution paths labeled separately. The goal is not to make the
          system sound effortless. The goal is to make responsibility legible.
        </p>
      </section>

      <section className="docs-page-section">
        <h2>Operator truth</h2>
        <div className="docs-connection-grid">
          <article className="docs-connection-card">
            <h3>Readable execution state</h3>
            <p>
              Users and reviewers should be able to tell when Vanta is showing a
              live flow, a constrained operator-backed path, or a preview-only
              surface.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Explicit operator role</h3>
            <p>
              Vanta does not pretend the operator disappears just because the UI
              looks polished. If operator truth or operator release logic is
              part of the current flow, the docs should keep that visible.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Shared product truth</h3>
            <p>
              Docs copy, product UI, and reviewer-facing status surfaces should
              all describe the same product state instead of drifting into
              separate stories.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Verification surfaces</h2>
        <p>
          Trust also depends on having concrete ways to check the story. Vanta
          keeps reviewer-facing commands in the repo so people can inspect the
          operator boundary instead of relying on a screenshot or summary alone.
        </p>
        <div className="docs-callout">
          <strong>Use the verification surfaces, not just the headline.</strong>
          <p>
            The private-core operator contract, status, snapshot, and shipping
            commands are there to show what the repo can actually prove today.
            They matter because Vanta is still narrowing the path to real
            readiness.
          </p>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>What this page is claiming today</h2>
        <ul className="docs-bullet-list">
          <li>Approval boundaries are part of the product contract, not a docs footnote.</li>
          <li>Preview, demo, control-plane, and live surfaces should say what they are.</li>
          <li>Operator-backed truth still matters to the current narrow flows.</li>
          <li>Verification commands are the right place to check current status.</li>
        </ul>
      </section>

      <section className="docs-page-section">
        <h2>What these docs do not claim</h2>
        <div className="docs-callout">
          <strong>Trust comes from legibility, not overclaiming.</strong>
          <p>
            These docs do not claim that all Vanta surfaces are production-ready
            or that normal wallet activity becomes private automatically.
            Merchant preview, control-plane visibility, and live proof or
            operator surfaces are not the same thing, and the docs keep those
            differences visible.
          </p>
        </div>
      </section>
    </DocsPageTemplate>
  );
}
