import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { LandingLiveStrip } from "@/components/LandingLiveStrip";

type LandingGlyph = "exit" | "private-rails" | "receipt" | "shield";

const productPoints = [
  {
    copy: "Move supported assets through the beta shield flow.",
    icon: "shield",
    title: "Shield",
  },
  {
    copy: "Send, swap, and exit from shielded state.",
    icon: "private-rails",
    title: "Use",
  },
  {
    copy: "Accept payments. Receipts merchants can verify.",
    icon: "receipt",
    title: "Get paid",
  },
  {
    copy: "Unshield back to a wallet, anytime.",
    icon: "exit",
    title: "Exit",
  },
] satisfies Array<{ copy: string; icon: LandingGlyph; title: string }>;

const primaryAppActions = [
  {
    label: "Shield",
    outcome: "Move assets into shielded state.",
    path: "shield",
    status: "Beta",
  },
  {
    label: "Send",
    outcome: "Send from shielded state to another wallet.",
    path: "send",
    status: "Beta",
  },
  {
    label: "Swap",
    outcome: "Swap from shielded state.",
    path: "swap",
    status: "Beta",
  },
  {
    label: "Unshield",
    outcome: "Withdraw from shielded state back to a wallet.",
    path: "unshield",
    status: "Beta",
  },
];

const previewAppActions = [
  {
    copy: "Create payment requests. Preview verifiable receipts.",
    eyebrow: "Pay",
    label: "Collect payments",
    path: "pay",
    status: "Preview",
  },
  {
    copy: "Plan trades before live routing is enabled.",
    eyebrow: "Strategy",
    label: "Plan execution",
    path: "strategy",
    status: "Preview",
  },
];

function LandingPointGlyph({ name }: { name: LandingGlyph }) {
  return (
    <span className="landing-minimal__point-glyph" data-vanta-landing-glyph={name} aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false">
        {name === "shield" ? (
          <path d="M16 4l9 3v7c0 6-3.7 10.7-9 14-5.3-3.3-9-8-9-14V7l9-3z" />
        ) : null}
        {name === "private-rails" ? (
          <>
            <path d="M8 12h13" />
            <path d="M17 8l4 4-4 4" />
            <path d="M24 20H11" />
            <path d="M15 16l-4 4 4 4" />
          </>
        ) : null}
        {name === "receipt" ? (
          <>
            <path d="M10 5h12v22l-3-2-3 2-3-2-3 2V5z" />
            <path d="M13 12h6" />
            <path d="M13 17h6" />
          </>
        ) : null}
        {name === "exit" ? (
          <>
            <path d="M7 6h11v20H7z" />
            <path d="M16 16h9" />
            <path d="M21 12l4 4-4 4" />
          </>
        ) : null}
      </svg>
    </span>
  );
}

function LandingHeroFlowVisual() {
  return (
    <aside
      className="landing-minimal__flow-visual"
      aria-label="Local preview of Vanta flow"
      data-vanta-landing-flow-visual
    >
      <div className="landing-minimal__flow-header">
        <span>Preview</span>
        <strong>Wallet to shielded state</strong>
      </div>

      <div className="landing-minimal__flow-map" aria-hidden="true">
        <svg className="landing-minimal__flow-line" viewBox="0 0 420 120" data-vanta-landing-flow-line>
          <path d="M68 60 C134 18 188 18 240 60 S334 102 354 60" />
        </svg>
        <span className="landing-minimal__flow-packet" data-vanta-landing-flow-packet />
        <div className="landing-minimal__flow-node" data-vanta-landing-flow-node="wallet">
          <span />
          <strong>Wallet</strong>
          <small>Selected assets</small>
        </div>
        <div className="landing-minimal__flow-node" data-vanta-landing-flow-node="shield">
          <span />
          <strong>Shield</strong>
          <small>Vanta entry</small>
        </div>
        <div className="landing-minimal__flow-node" data-vanta-landing-flow-node="shielded-state">
          <span />
          <strong>Shielded state</strong>
          <small>Send, swap, exit</small>
        </div>
      </div>

      <p>Preview only. Production privacy is not enabled yet.</p>
    </aside>
  );
}

export function HomePage() {
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    document.body.classList.add("landing-body");

    const handleScroll = () => {
      setNavScrolled(window.scrollY > 32);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.body.classList.remove("landing-body");
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <main className="landing-page landing-page--minimal">
      <div className="landing-minimal__grid" aria-hidden="true" />
      <div className="landing-minimal__glow landing-minimal__glow--left" aria-hidden="true" />
      <div className="landing-minimal__glow landing-minimal__glow--right" aria-hidden="true" />

      <nav className={navScrolled ? "landing-nav landing-nav--scrolled" : "landing-nav"}>
        <Link className="landing-nav__logo" to="/">
          <BrandMark />
          <span className="landing-nav__wordmark">VANTA</span>
        </Link>

        <div className="landing-nav__links">
          <a href="#what">How it works</a>
          <a href="#use">Open actions</a>
          <Link to="/manifesto">Manifesto</Link>
          <Link to="/docs">Docs</Link>
          <a href="https://x.com/vantaprivacy" target="_blank" rel="noreferrer">
            X
          </a>
          <Link className="landing-nav__cta" to="/app">
            Shield now
          </Link>
        </div>
      </nav>

      <section className="landing-minimal__hero">
        <div className="landing-minimal__hero-shell">
          <div className="landing-minimal__hero-copy">
            <div className="landing-minimal__kicker">Private Solana · beta</div>
            <h1>
              Shield first.
              <span> Simple on the surface.</span>
            </h1>
            <p>
              Shield first. Simple on the surface. Move assets into shielded state, then test send, swap, and exit
              flows. Beta on devnet — production privacy is not enabled yet.
            </p>

            <div className="landing-minimal__actions">
              <Link className="landing-btn landing-btn--primary" to="/app">
                Shield now
              </Link>
              <a className="landing-btn landing-btn--ghost" href="#use">
                See open actions
              </a>
            </div>
          </div>

          <LandingHeroFlowVisual />
        </div>
      </section>

      <LandingLiveStrip />

      <section className="landing-minimal__proof-link-panel" aria-label="Proof and readiness">
        <Link className="v-proof-drawer landing-minimal__proof-link" to="/app/proof">
          <span>Proof details — anonymity readiness, lane locks, and verification commands</span>
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section
        className="landing-minimal__panel landing-minimal__panel--narrative"
        id="what"
        aria-label="What Vanta does"
      >
        <div className="landing-minimal__section-header">
          <span>What it does</span>
          <h2>Four things.</h2>
        </div>

        <div className="landing-minimal__points landing-minimal__points--features">
          {productPoints.map((point) => (
            <article key={point.title} className="landing-minimal__point landing-minimal__point--feature">
              <LandingPointGlyph name={point.icon} />
              <strong>{point.title}</strong>
              <p>{point.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="landing-minimal__panel landing-minimal__panel--split landing-minimal__panel--actions"
        id="use"
      >
        <div className="landing-minimal__section-header">
          <span>Inside the app</span>
          <h2>Open actions.</h2>
        </div>

        <div className="landing-minimal__action-group">
          <span className="landing-minimal__action-kicker">Wallet lanes</span>
          <div
            className="landing-minimal__action-list landing-minimal__action-list--primary"
            aria-label="Primary Vanta wallet actions"
          >
            {primaryAppActions.map((action) => (
              <Link key={action.path} to={`/app/${action.path}`} data-vanta-landing-action-card>
                <span className="landing-minimal__action-status">{action.status}</span>
                <strong>{action.label}</strong>
                <small data-vanta-landing-action-outcome>{action.outcome}</small>
                <span className="landing-minimal__action-arrow" data-vanta-landing-action-arrow aria-hidden="true">
                  -&gt;
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="landing-minimal__action-preview" aria-label="Vanta preview surfaces">
          <span className="landing-minimal__action-kicker">Preview surfaces</span>
          <div className="landing-minimal__preview-list">
            {previewAppActions.map((action) => (
              <Link
                key={action.path}
                className="landing-minimal__preview-link"
                to={`/app/${action.path}`}
                data-vanta-landing-action-card
              >
                <span className="landing-minimal__action-status">
                  {action.eyebrow} · {action.status}
                </span>
                <strong>{action.label}</strong>
                <small data-vanta-landing-action-outcome>{action.copy}</small>
                <span className="landing-minimal__action-arrow" data-vanta-landing-action-arrow aria-hidden="true">
                  Open app to preview receipt
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
