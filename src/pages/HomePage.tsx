import { Link } from "react-router-dom";
import { FeatureCard } from "@/components/FeatureCard";
import { HeroPanel } from "@/components/HeroPanel";
import { SectionHeading } from "@/components/SectionHeading";
import { TopNav } from "@/components/TopNav";
import { capabilities, roadmap } from "@/data/site";

export function HomePage() {
  return (
    <div className="site-shell">
      <div className="site-background" aria-hidden="true" />
      <TopNav />

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">shield first. move privately.</span>
            <h1>Private money movement for Solana.</h1>
            <p>
              Shield assets, move privately, and exit cleanly when you need to.
            </p>
            <p className="hero-subtext">
              Live today: shield, private send, unshield, and constrained swap.
            </p>
            <div className="hero-status">
              <span>Live: Shield</span>
              <span>Live: Send</span>
              <span>Live: Unshield</span>
              <span>Live: Swap</span>
            </div>
            <div className="hero-actions">
              <Link className="button button-primary" to="/app">
                Open app
              </Link>
              <a className="button button-ghost" href="#modules">
                View modules
              </a>
            </div>
          </div>
          <HeroPanel />
        </section>

        <section className="thesis-strip" id="overview">
          <div>
            <span>Now</span>
            <p>Shield into private state, then send or swap from there.</p>
          </div>
          <div>
            <span>Core lane</span>
            <p>Shield → hold → private send → unshield → release.</p>
          </div>
          <div>
            <span>Later</span>
            <p>Payments, subscriptions, and broader private commerce rails.</p>
          </div>
        </section>

        <section className="content-section" id="modules">
          <SectionHeading
            eyebrow="Modules"
            title="A small surface area, built in sequence."
            description="Start with shield. Use send now. Expand into swap and payments from the same private state."
          />

          <div className="feature-grid">
            {capabilities.map((capability) => (
              <FeatureCard key={capability.title} {...capability} />
            ))}
          </div>
        </section>

        <section className="content-section" id="roadmap">
          <SectionHeading
            eyebrow="Roadmap"
            title="Start narrow. Expand carefully."
            description="One strong private-core lane first. Broader private money flows after that."
          />

          <div className="roadmap-list">
            {roadmap.map((item) => (
              <article key={item.phase} className="roadmap-card">
                <span>{item.phase}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta-panel">
          <div>
            <span>Live app</span>
            <h2>Open the current private-core flow.</h2>
            <p>Shield in. Send privately. Exit cleanly.</p>
          </div>
          <Link className="button button-primary" to="/app">
            Enter app
          </Link>
        </section>
      </main>
    </div>
  );
}
