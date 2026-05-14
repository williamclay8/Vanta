import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnonymityDepthDisclosure } from "@/components/AnonymityDepthDisclosure";
import { BrandMark } from "@/components/BrandMark";
import { LandingLiveStrip } from "@/components/LandingLiveStrip";

type LandingGlyph = "exit" | "private-rails" | "receipt" | "shield";

const productPoints = [
  {
    copy: "Move selected Solana assets into Vanta before sending, swapping, or exiting.",
    icon: "shield",
    title: "Shield assets",
  },
  {
    copy: "Test Shield, Send, Swap, and Unshield with receipts that show what can be verified.",
    icon: "private-rails",
    title: "Use current lanes",
  },
  {
    copy: "Create payment requests and local receipt-backed records merchants can inspect.",
    icon: "receipt",
    title: "Accept payments",
  },
  {
    copy: "Move balances back to a public wallet when you choose to leave Vanta.",
    icon: "exit",
    title: "Exit on your terms",
  },
] satisfies Array<{ copy: string; icon: LandingGlyph; title: string }>;

const primaryAppActions = [
  {
    label: "Shield funds",
    outcome: "Move selected assets into Vanta before Send, Swap, or Unshield.",
    path: "shield",
    status: "Wallet lane",
  },
  {
    label: "Send from shielded state",
    outcome: "Create receipt-backed transfers from shielded state.",
    path: "send",
    status: "Wallet lane",
  },
  {
    label: "Swap from shielded state",
    outcome: "Preview swap routing from shielded state with proof and route context.",
    path: "swap",
    status: "Wallet lane",
  },
  {
    label: "Unshield funds",
    outcome: "Exit selected balances back to a public wallet.",
    path: "unshield",
    status: "Wallet lane",
  },
];

const previewAppActions = [
  {
    copy: "Create payment requests and local receipt-backed records for merchant review.",
    eyebrow: "Pay preview",
    label: "Collect payments",
    path: "pay",
    status: "Preview",
  },
  {
    copy: "Preview private-rail execution planning before live routing is enabled.",
    eyebrow: "Strategy preview",
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
        <span>Local preview</span>
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
          <small>Receipts where available</small>
        </div>
      </div>

      <p>Illustrates the intended flow; not production-private proof.</p>
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
          <Link to="/docs">Docs</Link>
          <a href="https://x.com/vantaprivacy" target="_blank" rel="noreferrer">
            X
          </a>
          <Link className="landing-nav__cta" to="/app">
            Open App
          </Link>
        </div>
      </nav>

      <section className="landing-minimal__hero">
        <div className="landing-minimal__hero-shell">
          <div className="landing-minimal__hero-copy">
            <div className="landing-minimal__kicker">Receipt-backed Solana settlement</div>
            <h1>
              Make Solana settlement
              <span> less public.</span>
            </h1>
            <p>
              Move selected assets into Vanta, test Shield, Send, Swap, and
              Unshield, and share receipts that show what can be verified.
            </p>

            <div className="landing-minimal__actions">
              <Link className="landing-btn landing-btn--primary" to="/app">
                Enter App
              </Link>
              <a className="landing-btn landing-btn--ghost" href="#what">
                Learn More
              </a>
            </div>
          </div>

          <LandingHeroFlowVisual />
        </div>
      </section>

      <LandingLiveStrip />

      <AnonymityDepthDisclosure />

      <section
        className="landing-minimal__panel landing-minimal__panel--narrative"
        id="what"
        aria-label="What Vanta does"
      >
        <div className="landing-minimal__section-header">
          <span>What it does</span>
          <h2>Shield first. Simple on the surface.</h2>
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
          <h2>The actions Vanta can show honestly.</h2>
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
                  -&gt;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
