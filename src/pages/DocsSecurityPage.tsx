import { DocsPageTemplate } from "@/components/DocsPageTemplate";
import { getDocsPageMeta } from "@/docs/docsContent";

export function DocsSecurityPage() {
  const page = getDocsPageMeta("security");

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
        <h2>Privacy model</h2>
        <p>
          Vanta&apos;s privacy model starts with a simple rule: an ordinary public
          wallet is still public. Privacy begins only when supported assets move
          into Vanta&apos;s separate private flow.
        </p>
        <p>
          From there, the security job is to keep the current path honest: what
          is held privately, what still needs operator support, what is checked
          by proofs, and where the system is still limited.
        </p>
      </section>

      <section className="docs-page-section">
        <h2>Current constraints</h2>
        <div className="docs-step-grid" aria-label="Security themes">
          <article className="docs-step-card">
            <span>1</span>
            <strong>Constrained lanes</strong>
            <p>
              Today&apos;s product surface is intentionally narrow. A narrow flow
              can be real, but it is not the same as broad asset support or
              final privacy coverage.
            </p>
          </article>
          <article className="docs-step-card">
            <span>2</span>
            <strong>Operator-backed boundaries</strong>
            <p>
              Some release and settlement behavior still depends on operator
              checks and explicit approvals. The docs keep those boundaries
              visible instead of turning them into a generic privacy promise.
            </p>
          </article>
          <article className="docs-step-card">
            <span>3</span>
            <strong>Readiness still in progress</strong>
            <p>
              Vanta still needs audited proof boundaries, durable services,
              secure secret handling, and the rest of the production-readiness
              bar described in the repo mission.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Security disciplines that matter now</h2>
        <ul className="docs-bullet-list">
          <li>Replay protection matters: the same private note should not be spendable twice.</li>
          <li>Approval fidelity matters: what the user sees before signing should match what the system will do.</li>
          <li>User-facing trust paths should be checked in a browser when behavior matters, not only inferred from code.</li>
        </ul>
      </section>

      <section className="docs-page-section">
        <h2>Readiness honesty</h2>
        <div className="docs-callout docs-callout--warm">
          <strong>Security copy should make the current limit obvious.</strong>
          <p>
            These docs do not present Vanta as production-ready, fully audited,
            or final from a privacy perspective. Preview checkout and merchant
            dashboards help explain the system, but they do not turn it into a
            finished payment network.
          </p>
        </div>
      </section>
    </DocsPageTemplate>
  );
}
