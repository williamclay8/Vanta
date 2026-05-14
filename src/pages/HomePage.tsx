import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnonymityDepthDisclosure } from "@/components/AnonymityDepthDisclosure";
import { BrandMark } from "@/components/BrandMark";
import { LandingLiveStrip } from "@/components/LandingLiveStrip";

const productPoints = [
  {
    copy: "Move selected Solana assets into Vanta before sending, swapping, or exiting.",
    title: "Shield assets",
  },
  {
    copy: "Test Shield, Send, Swap, and Unshield with receipts that show what can be verified.",
    title: "Use current lanes",
  },
  {
    copy: "Create payment requests and local receipt-backed records merchants can inspect.",
    title: "Accept payments",
  },
  {
    copy: "Move balances back to a public wallet when you choose to leave Vanta.",
    title: "Exit on your terms",
  },
];

const primaryAppActions = [
  { label: "Shield funds", path: "shield" },
  { label: "Send from shielded state", path: "send" },
  { label: "Swap from shielded state", path: "swap" },
  { label: "Unshield funds", path: "unshield" },
];

const previewAppActions = [
  {
    copy: "Create payment requests and local receipt-backed records for merchant review.",
    eyebrow: "Pay preview",
    label: "Collect payments",
    path: "pay",
  },
  {
    copy: "Preview private-rail execution planning before live routing is enabled.",
    eyebrow: "Strategy preview",
    label: "Plan execution",
    path: "strategy",
  },
];

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
              <Link key={action.path} to={`/app/${action.path}`}>
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="landing-minimal__action-preview" aria-label="Vanta preview surfaces">
          <span className="landing-minimal__action-kicker">Preview surfaces</span>
          <div className="landing-minimal__preview-list">
            {previewAppActions.map((action) => (
              <Link key={action.path} className="landing-minimal__preview-link" to={`/app/${action.path}`}>
                <span>{action.eyebrow}</span>
                <strong>{action.label}</strong>
                <small>{action.copy}</small>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
