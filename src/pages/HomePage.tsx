import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const featureCards = [
  {
    body: "Move supported assets out of transparent wallet flows and into private state first.",
    title: "Shielded State",
  },
  {
    body: "Use that state in the live constrained send lane without broadcasting the full graph.",
    title: "Private Send",
  },
  {
    body: "Prove, register, unshield, and release through one explicit narrow zk v1 handoff path.",
    title: "Release Flow",
  },
  {
    body: "Operate through typed boundaries, machine-readable operator surfaces, and reviewer-ready artifacts.",
    title: "Operator Truth",
  },
  {
    body: "Constrained swap already exists beside the finish line and expands the private execution surface.",
    title: "Private Swap",
  },
  {
    body: "The current shipped definition is tight on purpose: one strong private-core lane before broader expansion.",
    title: "Disciplined Scope",
  },
];

const flowSteps = [
  {
    body: "Move supported assets from public wallet state into Vanta Private Core.",
    label: "01",
    title: "Shield",
  },
  {
    body: "Use shielded value through the live send lane and evolve state privately.",
    label: "02",
    title: "Send",
  },
  {
    body: "Register the resulting root, unshield through the constrained exit, and complete release.",
    label: "03",
    title: "Release",
  },
];

function VantaGlyph({ hero = false }: { hero?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={hero ? "landing-glyph landing-glyph--hero" : "landing-glyph"}
      viewBox="0 0 100 100"
      fill="none"
    >
      <defs>
        <linearGradient id={hero ? "landingGlyphHero" : "landingGlyph"} x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#00e5c8" />
          <stop offset="100%" stopColor="#00b89e" />
        </linearGradient>
        <filter id={hero ? "landingGlyphHeroFilter" : "landingGlyphFilter"} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {hero ? (
        <path
          d="M50 4 L96 50 L50 96 L4 50 Z"
          fill="none"
          stroke={`url(#${hero ? "landingGlyphHero" : "landingGlyph"})`}
          strokeWidth="1.4"
          strokeDasharray="3 4"
          opacity="0.3"
        />
      ) : null}
      <path
        d="M18 18 L50 82 L50 58 L34 18 Z"
        fill="#0a1f24"
        stroke={`url(#${hero ? "landingGlyphHero" : "landingGlyph"})`}
        strokeWidth="2"
        strokeLinejoin="round"
        filter={`url(#${hero ? "landingGlyphHeroFilter" : "landingGlyphFilter"})`}
      />
      <path
        d="M82 18 L50 82 L50 58 L66 18 Z"
        fill="#061618"
        stroke={`url(#${hero ? "landingGlyphHero" : "landingGlyph"})`}
        strokeWidth="2"
        strokeLinejoin="round"
        filter={`url(#${hero ? "landingGlyphHeroFilter" : "landingGlyphFilter"})`}
      />
      <path d="M34 18 L50 58 L66 18 Z" fill="#020305" />
      <circle
        cx="50"
        cy="82"
        r={hero ? "2.8" : "3"}
        fill="#00e5c8"
        filter={`url(#${hero ? "landingGlyphHeroFilter" : "landingGlyphFilter"})`}
      />
    </svg>
  );
}

export function HomePage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [waitlistValue, setWaitlistValue] = useState("");
  const [waitlistAdded, setWaitlistAdded] = useState(false);

  const stats = useMemo(
    () => [
      { label: "Shipped lane", value: "Shield → Send → Release" },
      { label: "Status", value: "zk v1 shipped" },
      { label: "Proof model", value: "ZK-native" },
      { label: "Operator surface", value: "Reviewer ready" },
    ],
    [],
  );

  useEffect(() => {
    document.body.classList.add("landing-body");

    const handleScroll = () => {
      setNavScrolled(window.scrollY > 40);
    };

    const revealNodes = Array.from(
      document.querySelectorAll<HTMLElement>(".landing-reveal"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (!entry.isIntersecting) {
            return;
          }

          window.setTimeout(() => {
            entry.target.classList.add("visible");
          }, index * 60);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );

    revealNodes.forEach((node) => observer.observe(node));
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    const cursor = document.getElementById("landingCursor");
    const ring = document.getElementById("landingCursorRing");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let frame = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;

      if (cursor) {
        cursor.style.left = `${mouseX}px`;
        cursor.style.top = `${mouseY}px`;
      }
    };

    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;

      if (ring) {
        ring.style.left = `${ringX}px`;
        ring.style.top = `${ringY}px`;
      }

      frame = window.requestAnimationFrame(animateRing);
    };

    window.addEventListener("mousemove", handleMouseMove);
    animateRing();

    return () => {
      document.body.classList.remove("landing-body");
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="landing-page">
      <div className="landing-cursor" id="landingCursor" aria-hidden="true" />
      <div
        className="landing-cursor-ring"
        id="landingCursorRing"
        aria-hidden="true"
      />

      <nav className={navScrolled ? "landing-nav landing-nav--scrolled" : "landing-nav"}>
        <Link className="landing-nav__logo" to="/">
          <VantaGlyph />
          <span className="landing-nav__wordmark">VANTA</span>
        </Link>

        <div className="landing-nav__links">
          <a href="#features">Features</a>
          <a href="#flow">How It Works</a>
          <a href="#package">Release Package</a>
          <Link className="landing-nav__cta" to="/app">
            Open App
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero__grid" aria-hidden="true" />
        <div className="landing-hero__glow landing-hero__glow--left" aria-hidden="true" />
        <div className="landing-hero__glow landing-hero__glow--right" aria-hidden="true" />

        <div className="landing-hero__content">
          <div className="landing-hero__mark" aria-hidden="true">
            <VantaGlyph hero />
          </div>

          <div className="landing-hero__eyebrow">Now live on Solana devnet</div>

          <h1 className="landing-hero__title">
            <span>Transact in</span>
            <span className="landing-hero__title-accent">Private.</span>
          </h1>

          <p className="landing-hero__sub">
            Vanta is a ZK-native privacy suite for Solana. Shield into private
            state, move through the live send lane, and exit through one clean
            release path.
          </p>

          <div className="landing-hero__actions">
            <Link className="landing-btn landing-btn--primary" to="/app">
              Enter Vanta
            </Link>
            <a className="landing-btn landing-btn--ghost" href="#flow">
              How It Works
            </a>
          </div>
        </div>

        <div className="landing-scroll-indicator" aria-hidden="true">
          <div className="landing-scroll-indicator__line" />
          <span>Scroll</span>
        </div>
      </section>

      <div className="landing-stats landing-reveal">
        {stats.map((stat) => (
          <div key={stat.label} className="landing-stat">
            <div className="landing-stat__value">{stat.value}</div>
            <div className="landing-stat__label">{stat.label}</div>
          </div>
        ))}
      </div>

      <section className="landing-features" id="features">
        <div className="landing-section-label landing-reveal">Core Features</div>
        <h2 className="landing-section-heading landing-reveal">
          Everything needed to move <span>without the full graph.</span>
        </h2>

        <div className="landing-features__grid landing-reveal">
          {featureCards.map((feature) => (
            <article key={feature.title} className="landing-feature-card">
              <div className="landing-feature-card__icon" aria-hidden="true" />
              <div className="landing-feature-card__title">{feature.title}</div>
              <div className="landing-feature-card__body">{feature.body}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-flow" id="flow">
        <div className="landing-flow__inner">
          <div className="landing-section-label landing-reveal">Process</div>
          <h2 className="landing-section-heading landing-reveal">
            Three steps to a <span>clean private-core lane.</span>
          </h2>

          <div className="landing-flow__steps landing-reveal">
            {flowSteps.map((step) => (
              <article key={step.label} className="landing-flow-step">
                <div className="landing-flow-step__num">
                  <span>{step.label}</span>
                </div>
                <div className="landing-flow-step__title">{step.title}</div>
                <div className="landing-flow-step__body">{step.body}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-package" id="package">
        <div className="landing-package__grid">
          <div className="landing-package__copy landing-reveal">
            <div className="landing-section-label">Release Package</div>
            <h2 className="landing-section-heading" style={{ marginBottom: 0 }}>
              The <span>shipped zk v1</span> handoff.
            </h2>
            <p>
              Vanta now ships one narrow private-core lane with an operator-owned
              release package, exact candidate lineage, shipping decision, and
              reviewer-ready readiness commands.
            </p>
            <div className="landing-package__pills">
              <div className="landing-pill">Exact candidate</div>
              <div className="landing-pill">Release package</div>
              <div className="landing-pill">Shipping decision</div>
              <div className="landing-pill">Reviewer ready</div>
              <div className="landing-pill">Solana devnet</div>
            </div>
          </div>

          <div className="landing-package__card landing-reveal">
            <div className="landing-package__glow" aria-hidden="true" />
            <div className="landing-package__symbol">zk v1</div>
            <div className="landing-package__name">Vanta Private Core</div>
            <div className="landing-package__rows">
              <div className="landing-package__row">
                <span>Lane</span>
                <span>Shield → Send → Release</span>
              </div>
              <div className="landing-package__row">
                <span>Scope</span>
                <span>Primary send-unshield only</span>
              </div>
              <div className="landing-package__row">
                <span>Status</span>
                <span>Shipped</span>
              </div>
              <div className="landing-package__row">
                <span>Artifact</span>
                <span>Operator-owned</span>
              </div>
              <div className="landing-package__row">
                <span>Review</span>
                <span>Release readiness</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta" id="waitlist">
        <h2 className="landing-reveal">
          Open the app.
          <br />
          <span>Stay private.</span>
        </h2>
        <p className="landing-reveal">
          Explore the current private-core flow and the exact release handoff
          package now.
        </p>

        <div className="landing-cta__input-row landing-reveal">
          <input
            className="landing-cta__input"
            type="text"
            placeholder="type 'vanta' to signal interest"
            value={waitlistValue}
            onChange={(event) => {
              setWaitlistValue(event.target.value);
              if (waitlistAdded) {
                setWaitlistAdded(false);
              }
            }}
          />
          <button
            className="landing-cta__button"
            type="button"
            onClick={() => {
              if (!waitlistValue.trim()) {
                return;
              }

              setWaitlistAdded(true);
              setWaitlistValue("");
            }}
          >
            {waitlistAdded ? "✓ Added" : "Join"}
          </button>
        </div>
        <p className="landing-cta__note landing-reveal">
          Demo cue only. Open the app for the real flow.
        </p>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer__logo">
          <VantaGlyph />
          <span className="landing-footer__wordmark">VANTA</span>
        </div>
        <div className="landing-footer__links">
          <Link to="/app">App</Link>
          <a href="#flow">Flow</a>
          <a href="#package">Package</a>
          <a href="#features">Features</a>
        </div>
        <div className="landing-footer__copy">
          Private movement on Solana
        </div>
      </footer>
    </div>
  );
}
