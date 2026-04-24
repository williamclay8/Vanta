import { DocsPageTemplate } from "@/components/DocsPageTemplate";
import { getDocsPageMeta } from "@/docs/docsContent";
import { roadmap } from "@/data/site";

export function DocsRoadmapPage() {
  const page = getDocsPageMeta("roadmap");

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
        <h2>Merchant-first direction</h2>
        <p>
          Vanta's roadmap is merchant-first in product language, even though
          Portal remains the clearest way to understand how the system works.
          Pay is the flagship direction because it turns private-state rails
          into a simpler settlement story for merchants and partners.
        </p>
        <p>
          That does not make Portal secondary or disposable. Portal is still
          the foundation that explains where privacy begins and how the current
          narrow lanes fit together. Today&apos;s repo truth is still a preview
          checkout plus merchant control-plane visibility, not a live merchant
          network.
        </p>
      </section>

      <section className="docs-page-section">
        <h2>How Portal and Pay connect</h2>
        <div className="docs-connection-grid">
          <article className="docs-connection-card">
            <h3>Portal explains the model</h3>
            <p>
              Shielded-state entry, private movement, and constrained exit paths
              are the base system Vanta can explain honestly today.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Pay packages the story</h3>
            <p>
              Pay takes the same rails and frames them around merchant needs:
              approval, settlement visibility, payouts, and reconciliation.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Shared truth still governs both</h3>
            <p>
              Neither path should outrun the current operator, pricing, or
              readiness truth. The roadmap only works if those surfaces stay in
              sync.
            </p>
          </article>
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Roadmap phases</h2>
        <div className="docs-step-grid" aria-label="Roadmap phases">
          {roadmap.map((phase, index) => (
            <article className="docs-step-card" key={phase.phase}>
              <span>{index + 1}</span>
              <strong>
                {phase.phase} {phase.title}
              </strong>
              <p>{phase.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="docs-page-section">
        <h2>Roadmap guardrails</h2>
        <ul className="docs-bullet-list">
          <li>Do not imply a finished merchant network before the work exists.</li>
          <li>Keep Portal and Pay connected as one system, not two disconnected brands.</li>
          <li>Keep preview, demo, control-plane, constrained, and live surfaces clearly labeled as the roadmap evolves.</li>
        </ul>
      </section>
    </DocsPageTemplate>
  );
}
