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
          Vanta&apos;s roadmap is merchant-first in product language, even though
          Portal remains the easiest way to understand how the system works.
          Pay is the flagship direction because merchants have a concrete
          problem: they need private checkout and settlement to feel like normal
          operations, not a protocol diagram.
        </p>
        <p>
          That does not make Portal secondary. Portal explains where privacy
          begins and how the current lanes fit together. Today&apos;s repo truth is
          still preview checkout plus merchant control-plane visibility, not a
          live merchant network.
        </p>
      </section>

      <section className="docs-page-section">
        <h2>How Portal and Pay connect</h2>
        <div className="docs-connection-grid">
          <article className="docs-connection-card">
            <h3>Portal explains the model</h3>
            <p>
              Portal gives the simple system path: shield into Vanta, use a
              supported private action, and unshield when needed.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Pay packages the story</h3>
            <p>
              Pay takes the same system and frames it around business needs:
              approval, settlement visibility, payouts, and reconciliation.
            </p>
          </article>
          <article className="docs-connection-card">
            <h3>Shared truth still governs both</h3>
            <p>
              Neither path should outrun the current operator or readiness
              truth. The roadmap only works if those pages keep telling the
              same story.
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
          <li>Use plain customer language first, then link to technical proof when readers need it.</li>
        </ul>
      </section>
    </DocsPageTemplate>
  );
}
