import { Link } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";

const manifestoPrinciples = [
  {
    title: "Shield now. Verify later.",
    copy: "Privacy is useful when the receipt is inspectable.",
  },
  {
    title: "Every action has a receipt.",
    copy: "Shield, Send, Swap, Unshield — each one points to a packet you can check.",
  },
  {
    title: "Beta truth. No theater.",
    copy: "What works today, what's preview, what's blocked — stated on the page.",
  },
  {
    title: "Boundaries are named.",
    copy: "Limits go in the open. Distribution grows from honest receipts.",
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
          <h1 id="manifesto-title">Privacy should reduce exposure, then prove what matters.</h1>
          <p data-vanta-manifesto-credo>
            Vanta is built by people who think privacy is a precondition for being a person,
            not a feature for being suspicious. We are building toward private settlement with
            proof-backed receipts. We will tell you when we cannot do that yet. We will not
            pretend to do it when we cannot.
          </p>
        </div>

        <aside className="manifesto-letter" aria-label="Manifesto truth boundary">
          <span>Public letter</span>
          <strong>Beta truth first. Receipt as proof.</strong>
          <p>
            Production privacy is not enabled. This is not an audit report. Open the
            app, shield once, and read the beta status before sharing a receipt.
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
          <span className="manifesto-eyebrow">Reviewer command</span>
          <h2>Check the claims for yourself.</h2>
        </div>
        <code>npm run public:manifesto-check</code>
        <p>This guard ties the manifesto, the audit alias, and the beta boundary together.</p>
      </section>
    </main>
  );
}
