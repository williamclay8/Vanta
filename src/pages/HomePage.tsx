import { Link } from "react-router-dom";
import { FeatureCard } from "@/components/FeatureCard";
import { HeroPanel } from "@/components/HeroPanel";
import { SectionHeading } from "@/components/SectionHeading";
import { TopNav } from "@/components/TopNav";
import {
  audiences,
  capabilities,
  howItWorks,
  roadmap,
  whyNow,
} from "@/data/site";

export function HomePage() {
  return (
    <div className="site-shell">
      <div className="site-background" aria-hidden="true" />
      <TopNav />

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">shield first. move privately.</span>
            <h1>Shield your Solana assets. Then move privately.</h1>
            <p>
              Vanta is a zk-powered privacy layer for Solana that lets users
              shield assets from public wallet flows and use them through
              private send, swap, and payment workflows.
            </p>
            <p className="hero-subtext">
              Vanta starts by letting users shield supported assets into a
              privacy-preserving state, then use them through private
              workflows beginning with send.
            </p>
            <div className="hero-status">
              <span>Live / MVP: Shield</span>
              <span>Live: Private Send</span>
              <span>Next: Private Swap</span>
              <span>Planned: Private Pay</span>
              <span>Future: Private Launch</span>
            </div>
            <div className="hero-actions">
              <Link className="button button-primary" to="/app">
                Open shield flow
              </Link>
              <a className="button button-ghost" href="#thesis">
                See how it works
              </a>
            </div>
          </div>
          <HeroPanel />
        </section>

        <section className="thesis-strip" id="thesis">
          <div>
            <span>What Vanta is</span>
            <p>
              Solana is fast and cheap, but radically transparent. Vanta brings
              a privacy layer for users who want to shield assets out of public
              wallet flows, hold them in shielded state, and use them through
              private workflows.
            </p>
          </div>
          <div>
            <span>Why Shield first</span>
            <p>
              Shield is the first product action because it establishes the
              privacy-preserving state that makes Send useful now and Swap and
              Pay coherent later.
            </p>
          </div>
        </section>

        <section className="content-section">
          <SectionHeading
            eyebrow="Problem / Solution"
            title="Privacy on Solana should be infrastructure, not improvisation."
            description="Public-by-default transaction graphs expose counterparties, execution patterns, treasury movement, and customer behavior. Vanta frames privacy as a state layer for the actions that matter most, beginning with shielding rather than treating privacy as a one-off transaction feature."
          />

          <div className="problem-solution-grid">
            <article>
              <span>Without Vanta</span>
              <h3>Every routine action becomes permanent market intelligence.</h3>
              <p>
                Transfers, swaps, and payments reveal balances, counterparties,
                operating patterns, and commercial relationships by default.
                For serious users, that is not transparency. It is leakage.
              </p>
            </article>
            <article>
              <span>With Vanta</span>
              <h3>Users enter a privacy layer before they act.</h3>
              <p>
                Supported assets move into the Vanta privacy layer first, then
                become available for private send workflows and, over time,
                richer swap and payment flows built on the same state.
              </p>
            </article>
          </div>
        </section>

        <section className="content-section" id="modules">
          <SectionHeading
            eyebrow="Modules"
            title="A focused product surface with explicit scope and sequencing."
            description="Judges and users should be able to see immediately that Shield is the entrypoint, Send is the first live workflow, Swap is next, Pay is planned, and Launch remains a future network-facing direction."
          />

          <div className="feature-grid">
            {capabilities.map((capability) => (
              <FeatureCard key={capability.title} {...capability} />
            ))}
          </div>
        </section>

        <section className="content-section">
          <SectionHeading
            eyebrow="How It Works"
            title="Enter privacy once. Build from there."
            description="Vanta begins by moving supported assets out of transparent wallet flows and into a shielded state. From there, users can act through private workflows designed to reduce public traceability without turning the experience into a black box."
          />

          <div className="audience-grid">
            {howItWorks.map((item) => (
              <article key={item.label} className="audience-card">
                <span>{item.label}</span>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="content-section" id="privacy">
          <SectionHeading
            eyebrow="Why Solana Privacy Matters"
            title="Speed and low fees matter. So does not exposing your full graph."
            description="Solana is evolving from a trading venue into real financial and commercial infrastructure. That makes practical confidentiality more important, not less, for users, developers, token ecosystems, and operators who need fast execution without total visibility into wallet flows."
          />

          <div className="privacy-primitives">
            <article>
              <span>For users</span>
              <p>
                Keep ordinary transfers from exposing full wallet context to
                anyone willing to inspect the chain.
              </p>
            </article>
            <article>
              <span>For traders</span>
              <p>
                Reduce strategy leakage created by fully transparent routing,
                timing, and position movement.
              </p>
            </article>
            <article>
              <span>For merchants</span>
              <p>
                Support payment flows without turning customers, revenues, and
                treasury operations into public dashboards.
              </p>
            </article>
          </div>
        </section>

        <section className="content-section">
          <SectionHeading
            eyebrow="Why Now"
            title="The timing is right for a serious privacy product on Solana."
            description="For a judge, the case should be clear in under a minute: Solana already has throughput, users, and emerging commerce demand. What it still lacks is a privacy product with a believable shielded-state entrypoint and a credible path outward."
          />

          <div className="audience-grid">
            {whyNow.map((item) => (
              <article key={item.label} className="audience-card">
                <span>{item.label}</span>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="content-section">
          <SectionHeading
            eyebrow="Philosophy"
            title="Built as product-first privacy infrastructure for the Solana stack."
            description="Vanta is not centered on speculation or token theater. The product is the point: a clean interface for privacy-preserving Solana actions, with $VANTA reserved for future ecosystem infrastructure rather than the main story."
          />

          <div className="audience-grid">
            {audiences.map((audience) => (
              <article key={audience.label} className="audience-card">
                <span>{audience.label}</span>
                <p>{audience.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="content-section" id="roadmap">
          <SectionHeading
            eyebrow="Roadmap"
            title="A disciplined path from one strong primitive to a broader privacy suite."
            description="The roadmap keeps present scope clear and long-term ambition credible: Shield plus Private Send form Phase 1, then the privacy layer expands into Swap, Pay, and the broader Vanta network."
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
            <span>MVP demo</span>
            <h2>Explore the current Vanta app shell.</h2>
            <p>
              Review the Shield entrypoint, the live Send workflow built on
              shielded balances, and the next expansion path into Swap, Pay,
              and future Vanta network surfaces.
            </p>
          </div>
          <Link className="button button-primary" to="/app">
            Enter Shield
          </Link>
        </section>
      </main>
    </div>
  );
}
