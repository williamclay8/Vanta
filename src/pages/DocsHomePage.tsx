import { Link } from "react-router-dom";
import { DocsStatusBadge } from "@/components/DocsStatusBadge";
import { getDocsPageMeta } from "@/docs/docsContent";

export function DocsHomePage() {
  const portalPage = getDocsPageMeta("portal");
  const payPage = getDocsPageMeta("pay");

  if (!portalPage || !payPage) {
    return null;
  }

  return (
    <div className="docs-home">
      <section className="docs-home__hero product-intro">
        <span className="docs-home__eyebrow product-intro__eyebrow">Vanta Docs</span>
        <h1 className="docs-home__title">Vanta makes Solana activity less public.</h1>
        <p className="docs-home__lede">
          Solana wallets are easy to trace. Vanta gives privacy a clear
          starting point: move supported assets into Vanta, use supported
          private actions, and move back to a public wallet when you need to.
        </p>
        <div className="docs-home__hero-note">
          <strong>The useful part is simple.</strong>
          <p>
            Vanta helps people and merchants reduce public wallet traceability
            for supported flows. These docs explain that first, then label what
            is live, what is a preview, and what is not production-ready yet.
          </p>
        </div>
      </section>

      <section className="docs-home__plain-strip" data-docs-plain-strip>
        <article>
          <span>1</span>
          <strong>Start public</strong>
          <p>Your normal Solana wallet activity is visible onchain.</p>
        </article>
        <article>
          <span>2</span>
          <strong>Shield into Vanta</strong>
          <p>Move supported assets into Vanta before private actions begin.</p>
        </article>
        <article>
          <span>3</span>
          <strong>Use private actions</strong>
          <p>Use available lanes, with Swap and Pay labeled as constrained or preview surfaces until production-private gates clear.</p>
        </article>
        <article>
          <span>4</span>
          <strong>Return when needed</strong>
          <p>Unshield back to a public wallet when you are ready to exit.</p>
        </article>
      </section>

      <section className="docs-home__paths" aria-label="Vanta docs paths">
        <Link className="docs-path-card" to={portalPage.slug}>
          {portalPage.badge ? (
            <div className="docs-path-card__badge">
              <DocsStatusBadge badge={portalPage.badge} />
            </div>
          ) : null}
          <span className="docs-path-card__label">{portalPage.title}</span>
          <strong>{portalPage.summary}</strong>
          <p>
            Start here for the user path: shield supported assets, use a
            private action, and return to a public wallet when you are done.
          </p>
        </Link>
        <Link className="docs-path-card docs-path-card--pay" to={payPage.slug}>
          {payPage.badge ? (
            <div className="docs-path-card__badge">
              <DocsStatusBadge badge={payPage.badge} />
            </div>
          ) : null}
          <span className="docs-path-card__label">{payPage.title}</span>
          <strong>{payPage.summary}</strong>
          <p>
            Follow the merchant path: create and review payment requests,
            inspect records, and see what is still only a preview.
          </p>
        </Link>
      </section>

      <section className="docs-home__section">
        <div className="docs-home__section-heading">
          <span>Who it helps</span>
          <h2 className="docs-home__section-title">
            The same privacy idea serves users and merchants.
          </h2>
        </div>
        <div className="docs-home__connection-grid">
          <article className="docs-home__connection-card">
            <h3>Wallet users</h3>
            <p>
              Use Vanta when you do not want every supported action to look
              like a normal public wallet trail.
            </p>
          </article>
          <article className="docs-home__connection-card">
            <h3>Merchants</h3>
            <p>
              Preview private checkout and settlement records without making a
              business learn crypto plumbing before it can understand a payment.
            </p>
          </article>
          <article className="docs-home__connection-card">
            <h3>Reviewers</h3>
            <p>
              Check the claims through status pages and commands. The docs
              separate working lanes from previews and unfinished production
              work.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-home__section">
        <div className="docs-home__section-heading">
          <span>Current product truth</span>
          <h2 className="docs-home__section-title">
            Vanta is real, constrained, and not production-ready.
          </h2>
        </div>
        <div className="docs-home__truth-grid">
          <article className="docs-home__truth-card">
            <h3>Portal</h3>
            <p>
              The current wallet story is narrow but concrete: enter Vanta,
              move through supported private actions, and exit with clear
              boundaries.
            </p>
          </article>
          <article className="docs-home__truth-card">
            <h3>Pay</h3>
            <p>
              The merchant story is still forward-looking. Today it is a
              preview for payment requests and records, not a finished payments
              network.
            </p>
          </article>
          <article className="docs-home__truth-card">
            <h3>Trust pages</h3>
            <p>
              The shared pages explain who approves what, what the security
              limits are, and what remains on the roadmap.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
