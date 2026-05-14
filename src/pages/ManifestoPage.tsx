import { Link } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";

const manifestoPrinciples = [
  {
    title: "Privacy should be useful to someone else.",
    copy:
      "A private action matters when a merchant, customer, reviewer, or counterparty can verify enough to trust it without seeing everything.",
  },
  {
    title: "Receipts carry the work.",
    copy:
      "Vanta should leave behind proof-backed letters, packets, and status surfaces that explain what happened, what stayed private, and what still needs review.",
  },
  {
    title: "Truth beats theater.",
    copy:
      "The current beta must say what is implemented, what is blocked, and which operator or reviewer surface backs each claim.",
  },
  {
    title: "The operator stays visible.",
    copy:
      "Until Vanta retires operator trust, the public surfaces should name the current boundaries, blocked gates, and the path toward stronger settlement guarantees.",
  },
];

export function ManifestoPage() {
  return (
    <main className="landing-page manifesto-page" data-vanta-manifesto-page>
      <nav className="landing-nav landing-nav--scrolled manifesto-nav" aria-label="Manifesto navigation">
        <Link className="landing-nav__logo" to="/">
          <BrandMark />
          <span className="landing-nav__wordmark">VANTA</span>
        </Link>

        <div className="landing-nav__links">
          <Link to="/">Home</Link>
          <Link to="/docs">Docs</Link>
          <a href="/.well-known/audit">Audit</a>
          <Link className="landing-nav__cta" to="/app">
            Open App
          </Link>
        </div>
      </nav>

      <section className="manifesto-hero" aria-labelledby="manifesto-title">
        <div className="manifesto-hero__copy">
          <span className="manifesto-eyebrow">Vanta Manifesto</span>
          <h1 id="manifesto-title">Privacy should close the door, then prove what matters.</h1>
          <p data-vanta-manifesto-credo>
            Vanta is built by people who think privacy is a precondition for being a person,
            not a feature for being suspicious. We will close the door behind your transactions.
            We will tell you when we cannot do that yet. We will not pretend to do it when we cannot.
          </p>
        </div>

        <aside className="manifesto-letter" aria-label="Manifesto truth boundary">
          <span>Public letter</span>
          <strong>Beta truth first.</strong>
          <p>
            Production privacy is not enabled. This is not an audit report. Use the public audit
            alias and local verification commands for current reviewer evidence.
          </p>
          <div className="manifesto-letter__actions">
            <a href="/.well-known/audit">/.well-known/audit</a>
            <Link to="/docs/security">Security limits</Link>
          </div>
        </aside>
      </section>

      <section className="manifesto-principles" aria-label="Vanta principles">
        {manifestoPrinciples.map((principle) => (
          <article key={principle.title}>
            <span />
            <h2>{principle.title}</h2>
            <p>{principle.copy}</p>
          </article>
        ))}
      </section>

      <section className="manifesto-proof" aria-label="Reviewer commands">
        <div>
          <span className="manifesto-eyebrow">Current reviewer command</span>
          <h2>Check the surface, then check the claims.</h2>
        </div>
        <code>npm run public:manifesto-check</code>
        <p>
          This guard keeps the manifesto route, the audit alias, and the beta claim boundary
          tied to the same local truth surface.
        </p>
      </section>
    </main>
  );
}
