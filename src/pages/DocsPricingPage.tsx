import { DocsPageTemplate } from "@/components/DocsPageTemplate";
import { getDocsPageMeta } from "@/docs/docsContent";
import {
  VANTA_PRICING_CONTRACT,
  VANTA_PRICING_COPY,
} from "@/pricing/vantaPricing";

export function DocsPricingPage() {
  const page = getDocsPageMeta("pricing");

  if (!page) {
    return null;
  }

  return (
    <DocsPageTemplate
      title={page.title}
      summary={page.summary}
      badge={page.badge}
      nextStep={page.nextStep}
    >
      <section className="docs-page-section">
        <h2>Launch-stage pricing direction</h2>
        <p>{VANTA_PRICING_COPY.headline}</p>
        <p>
          This page explains pricing in the same plain terms the product should
          use with early users. Vanta is keeping the launch package narrow:
          no monthly subscription, a success fee only when a supported action
          actually works, and separate pass-through costs when outside services
          are involved.
        </p>
      </section>

      <section className="docs-page-section">
        <h2>What the current contract includes</h2>
        <p>
          When Vanta shows a supported paid action, this is the pricing shape
          the docs point to today.
        </p>
        <div className="docs-connection-grid">
          <article className="docs-connection-card">
            <h3>Monthly fee</h3>
            <p>0 monthly fee.</p>
          </article>
          <article className="docs-connection-card">
            <h3>Success fee</h3>
            <p>
              {VANTA_PRICING_CONTRACT.successFeeRateDisplay} only when a
              supported action completes successfully.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Separate costs</h3>
            <p>{VANTA_PRICING_COPY.passThrough}</p>
          </article>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>How the success fee works</h2>
        <div className="docs-callout">
          <strong>{VANTA_PRICING_CONTRACT.successFeeRateDisplay} on success.</strong>
          <p>
            Vanta charges only when a supported action completes successfully.
            Preview checkout, design-partner-only surfaces, and passive
            dashboard reading do not start billing. Network, off-ramp, and
            third-party execution costs are shown separately when they apply.
          </p>
        </div>
        <ul className="docs-bullet-list">
          <li>Failed actions do not trigger the Vanta fee.</li>
          <li>Preview-only and design-partner-only surfaces stay outside the live fee contract.</li>
          <li>Passive dashboard usage does not carry a monthly charge.</li>
        </ul>
      </section>

      <section className="docs-page-section">
        <h2>What pricing does not claim</h2>
        <p>{VANTA_PRICING_COPY.supporting}</p>
        <div className="docs-step-grid" aria-label="Pricing notes">
          {VANTA_PRICING_CONTRACT.passThroughCostLabels.map((label, index) => (
            <article className="docs-step-card" key={label}>
              <span>{index + 1}</span>
              <strong>{label}</strong>
              <p>
                Shown separately when the action needs it, instead of being
                hidden inside the Vanta fee.
              </p>
            </article>
          ))}
        </div>
        <div className="docs-callout docs-callout--warm">
          <strong>Pricing should stay aligned with product truth.</strong>
          <p>
            The current launch-stage direction is intentionally narrow. It is
            not a promise that every future Vanta surface is already billable,
            live, or part of a finished merchant package.
          </p>
        </div>
      </section>
    </DocsPageTemplate>
  );
}
