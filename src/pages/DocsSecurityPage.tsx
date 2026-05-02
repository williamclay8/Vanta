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
          wallet flow is still public. Privacy begins only when supported
          Solana stablecoins move into Vanta&apos;s separate private flow.
        </p>
        <p>
          From there, the security job is to keep the current path honest: what
          is held privately, what a counterparty can verify, what still needs
          operator support, what is checked by proofs, and where the system is
          still limited.
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
              can be real, but it is not the same as broad asset support,
              anonymous payments, or final privacy coverage.
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
            <strong>Production readiness is still in progress</strong>
            <p>
              Vanta still needs audited proof boundaries, durable services,
              secure secret handling, and the rest of the production-readiness
              bar described in the repo mission.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Terms readers should keep straight</h2>
        <div className="docs-truth-table" aria-label="Vanta docs glossary">
          <article>
            <strong>Public wallet flow</strong>
            <p>Normal onchain Solana activity. Vanta does not make that history private retroactively.</p>
          </article>
          <article>
            <strong>Private state</strong>
            <p>The supported Vanta path after a shield action, with narrower claims than broad wallet privacy.</p>
          </article>
          <article>
            <strong>Preview</strong>
            <p>A product surface that explains the intended workflow but is not live production infrastructure.</p>
          </article>
          <article>
            <strong>Production-ready</strong>
            <p>A higher bar requiring audited proof boundaries, durable services, secret handling, replay protection, and deployment evidence.</p>
          </article>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Security disciplines that matter now</h2>
        <ul className="docs-bullet-list">
          <li>Replay protection matters: the same private note should not be spendable twice.</li>
          <li>Approval fidelity matters: what the user sees before signing should match what the system will do.</li>
          <li>Receipt fidelity matters: a counterparty should be able to inspect what happened without learning the whole wallet trail.</li>
          <li>User-facing trust paths should be checked in a browser when behavior matters, not only inferred from code.</li>
        </ul>
      </section>

      <section className="docs-page-section">
        <h2>Readiness honesty</h2>
        <div className="docs-callout docs-callout--warm">
          <strong>Security copy should make the current limit obvious.</strong>
          <p>
            These docs do not present Vanta as production-ready, fully audited,
            untraceable, or final from a privacy perspective. Preview checkout
            and merchant dashboards help explain the system, but they do not
            turn it into a finished payment network or live mainnet-private
            settlement.
          </p>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Security checks</h2>
        <div className="docs-command-list" aria-label="Security verification commands">
          <article>
            <strong>Security limits</strong>
            <code>npm run security:limitations-check</code>
            <p>Checks the repo&apos;s security limitations page against required no-overclaiming language.</p>
          </article>
          <article>
            <strong>Privacy copy gate</strong>
            <code>npm run truth:privacy-claim-gate</code>
            <p>Checks that product-facing privacy language stays beta-truthful.</p>
          </article>
          <article>
            <strong>Docs browser gate</strong>
            <code>npm run docs:browser-check</code>
            <p>Checks the docs experience through the browser-backed route harness.</p>
          </article>
        </div>
      </section>
    </DocsPageTemplate>
  );
}
