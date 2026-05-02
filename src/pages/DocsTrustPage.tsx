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
      readFirst="Trust means a reader can tell what happened, what stayed private, who can verify the receipt, what is live today, and what is only a preview."
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
        <h2>Receipt and trust packet</h2>
        <p>
          Vanta&apos;s trust artifact should make private settlement useful to the
          other party in the transaction. A payer, merchant, OTC desk, treasury
          operator, or reviewer should not need the full wallet trail to know
          enough to act.
        </p>
        <div className="docs-step-grid" aria-label="Trust packet contents">
          <article className="docs-step-card">
            <span>1</span>
            <strong>What happened</strong>
            <p>
              The receipt should describe the supported action in plain
              settlement language, not only protocol terms.
            </p>
          </article>
          <article className="docs-step-card">
            <span>2</span>
            <strong>What stayed private</strong>
            <p>
              The trust packet should separate visible status from protected
              wallet or business-graph details.
            </p>
          </article>
          <article className="docs-step-card">
            <span>3</span>
            <strong>Who can verify</strong>
            <p>
              The counterparty should know what status, proof, operator
              surface, or command backs the claim.
            </p>
          </article>
        </div>
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
              the same product state. No separate marketing story and no
              stronger privacy claim than the current gates support.
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
        <div className="docs-command-list" aria-label="Trust verification commands">
          <article>
            <strong>Docs and app surface</strong>
            <code>npm run docs:verify</code>
            <p>Checks the docs route in a browser and runs the production build.</p>
          </article>
          <article>
            <strong>Pay truth boundary</strong>
            <code>npm run pay:doc-truth-check</code>
            <p>Checks that merchant-facing Pay copy stays aligned with beta truth.</p>
          </article>
          <article>
            <strong>Privacy claim gate</strong>
            <code>npm run truth:privacy-claim-gate</code>
            <p>Flags privacy wording that outruns the implemented proof and readiness gates.</p>
          </article>
          <article>
            <strong>Operator status</strong>
            <code>npm run private-core:operator-status-json</code>
            <p>Shows the machine-readable operator state backing the current private-core story.</p>
          </article>
        </div>
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
          <li>The receipt or trust packet is the artifact another party can inspect.</li>
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
            differences visible. They also do not claim anonymous, untraceable,
            fully private, or live mainnet-private settlement.
          </p>
        </div>
      </section>
    </DocsPageTemplate>
  );
}
