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
          Vanta&apos;s privacy model starts with shielding supported assets into a
          separate private-state flow. It does not claim that an ordinary public
          wallet balance becomes private on its own.
        </p>
        <p>
          From there, the security job is to keep the narrow product path
          explicit: what is held in shielded state, what is operator-backed
          today, what is verified by proof surfaces, and where the current
          constraints still limit the system.
        </p>
      </section>

      <section className="docs-page-section">
        <h2>Current constraints</h2>
        <div className="docs-step-grid" aria-label="Security themes">
          <article className="docs-step-card">
            <span>1</span>
            <strong>Constrained lanes</strong>
            <p>
              Today's product surface is intentionally narrow. A constrained
              flow can still be real, but it is not the same as claiming broad
              asset support or final privacy coverage.
            </p>
          </article>
          <article className="docs-step-card">
            <span>2</span>
            <strong>Operator-backed boundaries</strong>
            <p>
              Some release and settlement behavior still depends on operator
              truth and typed approvals. The security story stays honest only if
              those boundaries remain visible instead of being blurred into a
              generic privacy promise.
            </p>
          </article>
          <article className="docs-step-card">
            <span>3</span>
            <strong>Readiness still in progress</strong>
            <p>
              Vanta is still working toward audited proof boundaries, stronger
              service persistence, secure secret handling, and the rest of the
              production-readiness bar described in the repo mission.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Security disciplines that matter now</h2>
        <ul className="docs-bullet-list">
          <li>Replay and nullifier discipline should stay explicit at the proof and operator boundary.</li>
          <li>Approval fidelity matters: what the user sees before signing should match what the system is prepared to do.</li>
          <li>User-facing trust paths should be browser-checked when the behavior matters, not only inferred from code.</li>
        </ul>
      </section>

      <section className="docs-page-section">
        <h2>Readiness honesty</h2>
        <div className="docs-callout docs-callout--warm">
          <strong>Security copy should make the current limit obvious.</strong>
          <p>
            These docs do not present Vanta as production-ready, fully audited,
            or final from a privacy perspective. Preview checkout and
            control-plane visibility help explain the system, but they do not
            turn it into a finished merchant network. The public copy should
            stay honest about that.
          </p>
        </div>
      </section>
    </DocsPageTemplate>
  );
}
