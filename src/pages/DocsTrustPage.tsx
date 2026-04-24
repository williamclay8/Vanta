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
      readFirst="Trust means a reader can tell what Vanta can do today, what is only a preview, and what still needs approval or verification."
      badge={page.badge}
      nextStep={page.nextStep}
    >
      <section className="docs-page-section">
        <h2>Approval boundaries</h2>
        <p>
          Vanta treats trust as something people should be able to inspect, not
          something they have to take on faith. If a step needs a user decision,
          operator review, or execution approval, the product should say that in
          plain language.
        </p>
        <p>
          That is why these docs keep preview surfaces, design-partner flows,
          and live execution paths labeled separately. A reader should always be
          able to tell who is responsible for the next step.
        </p>
      </section>

      <section className="docs-page-section">
        <h2>Operator truth</h2>
        <div className="docs-connection-grid">
          <article className="docs-connection-card">
            <h3>Readable execution state</h3>
            <p>
              Users and reviewers should be able to tell whether they are
              seeing a live flow, a narrow operator-backed flow, or a preview.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Explicit operator role</h3>
            <p>
              If the current system depends on an operator check or release
              step, the docs should say so. A polished UI should not hide who is
              doing the work.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Shared product truth</h3>
            <p>
              The docs, the app, and the reviewer commands should all describe
              the same product state. No separate marketing story.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Verification surfaces</h2>
        <p>
          Trust also depends on having concrete ways to check the story. Vanta
          keeps reviewer-facing commands in the repo so people can inspect what
          the current system reports instead of relying on a screenshot.
        </p>
        <div className="docs-callout">
          <strong>Use the verification surfaces, not just the headline.</strong>
          <p>
            The private-core operator contract, status, snapshot, and shipping
            commands show what the repo can actually prove today. They matter
            because Vanta is still moving from a narrow working path toward real
            readiness.
          </p>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>What this page is claiming today</h2>
        <ul className="docs-bullet-list">
          <li>Approval boundaries are part of the product contract, not a footnote.</li>
          <li>Preview, demo, control-plane, and live surfaces should be labeled clearly.</li>
          <li>Operator-backed truth still matters to the current narrow flows.</li>
          <li>Verification commands are the best place to check current status.</li>
        </ul>
      </section>

      <section className="docs-page-section">
        <h2>What these docs do not claim</h2>
        <div className="docs-callout">
          <strong>Trust comes from legibility, not overclaiming.</strong>
          <p>
            These docs do not claim that all Vanta surfaces are production-ready
            or that normal wallet activity becomes private automatically. A
            merchant preview, an operator surface, a proof command, and a live
            operator path are different things, and the docs keep those
            differences visible.
          </p>
        </div>
      </section>
    </DocsPageTemplate>
  );
}
