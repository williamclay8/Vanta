import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";

const productPoints = [
  {
    copy: "Move supported Solana assets into shielded state before sending, swapping, or exiting.",
    title: "Shield assets",
  },
  {
    copy: "Send and execute through private-state flows instead of exposing every product step to users.",
    title: "Use private rails",
  },
  {
    copy: "Create payment links, accept private checkout, track balances, and withdraw through a commerce-first payment suite.",
    title: "Accept payments",
  },
  {
    copy: "Unshield supported balances and move funds back to public wallets only when you choose to exit.",
    title: "Exit on your terms",
  },
];

const appActions = ["Shield", "Send", "Swap", "Strategy", "Unshield", "Pay"];

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
          <a href="#what">What</a>
          <a href="#use">Use</a>
          <Link to="/docs">Docs</Link>
          <a href="https://x.com/vantaprivacy" target="_blank" rel="noreferrer">
            X
          </a>
          <Link className="landing-nav__cta" to="/app/send">
            Open App
          </Link>
        </div>
      </nav>

      <section className="landing-minimal__hero">
        <div className="landing-minimal__kicker">Private Solana suite</div>
        <h1>
          Privacy rails for
          <span> everyday crypto actions.</span>
        </h1>
        <p>
          Vanta helps users keep their money sovereign through a simpler privacy-first
          interface.
        </p>

        <div className="landing-minimal__actions">
          <Link className="landing-btn landing-btn--primary" to="/app/send">
            Enter App
          </Link>
          <a className="landing-btn landing-btn--ghost" href="#what">
            Learn More
          </a>
        </div>
      </section>

      <section
        className="landing-minimal__panel landing-minimal__panel--narrative"
        id="what"
        aria-label="What Vanta does"
      >
        <div className="landing-minimal__section-header">
          <span>What it does</span>
          <h2>Private by default. Simple on the surface.</h2>
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
          <h2>All the actions private users need.</h2>
        </div>

        <div className="landing-minimal__action-list" aria-label="Vanta app actions">
          {appActions.map((action) => (
            <Link key={action} to={`/app/${action.toLowerCase()}`}>
              {action}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
