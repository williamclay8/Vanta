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
        <h1 className="docs-home__title">Move, send, and pay with more privacy.</h1>
        <p className="docs-home__lede">
          Vanta is building a privacy layer for Solana. In everyday terms, it
          helps supported assets leave a fully public wallet trail, pass through
          supported private workflows, and come back out with clearer records
          for people and merchants.
        </p>
        <div className="docs-home__hero-note">
          <strong>Start here if you want the product story first.</strong>
          <p>
            These docs separate the simple story from the technical machinery:
            what Vanta does, what you can inspect today, what is still a
            preview, and what must be finished before anyone should call it
            production-ready.
          </p>
        </div>
      </section>

      <section className="docs-home__plain-strip" data-docs-plain-strip>
        <article>
          <span>1</span>
          <strong>What is Vanta?</strong>
          <p>A private workspace for supported Solana assets.</p>
        </article>
        <article>
          <span>2</span>
          <strong>What happens?</strong>
          <p>Move in, use supported private actions, move back out.</p>
        </article>
        <article>
          <span>3</span>
          <strong>What is still true?</strong>
          <p>Some flows are previews. Vanta is not production-ready yet.</p>
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
            Start here to understand the basic path: put supported assets into
            Vanta, use a supported private action, and take assets back out.
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
            Follow the business-facing path: checkout preview, settlement
            visibility, refunds, withdrawals, and the limits that still matter.
          </p>
        </Link>
      </section>

      <section className="docs-home__section">
        <div className="docs-home__section-heading">
          <span>One system, two paths</span>
          <h2 className="docs-home__section-title">
            Portal and Pay are two ways into the same privacy model.
          </h2>
        </div>
        <div className="docs-home__connection-grid">
          <article className="docs-home__connection-card">
            <h3>Vanta Portal is the crypto-native side.</h3>
            <p>
              It is the wallet path. A user shields supported assets, uses the
              private workflows Vanta supports today, and unshields when they
              want to return to a public wallet.
            </p>
          </article>
          <article className="docs-home__connection-card">
            <h3>Vanta Pay is the merchant-facing direction.</h3>
            <p>
              It is the business path. A merchant needs plain records for
              checkout, settlement, refunds, withdrawals, and receipts without
              learning protocol internals first.
            </p>
          </article>
          <article className="docs-home__connection-card">
            <h3>Truth matters as much as polish.</h3>
            <p>
              These pages label live, preview, and future work directly. The
              goal is to make the product understandable without making it sound
              more finished than it is.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-home__section">
        <div className="docs-home__section-heading">
          <span>Current product truth</span>
          <h2 className="docs-home__section-title">
            The current docs separate active system truth from preview direction.
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
              control plane and preview surface, not a finished payments
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
