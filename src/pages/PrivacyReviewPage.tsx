import { getVantaUmbraBenchmarkSnapshot } from "@/privacy/umbraBenchmark";

export function PrivacyReviewPage() {
  const snapshot = getVantaUmbraBenchmarkSnapshot();
  const reviewRoute = "/app/privacy-review";

  return (
    <section
      className="privacy-review-page"
      data-review-route={reviewRoute}
      aria-labelledby="privacy-review-title"
    >
      <div className="privacy-review-hero">
        <div>
          <span className="eyebrow">Review only</span>
          <h2 id="privacy-review-title">Approval samples</h2>
          <p>
            These are the human-readable approval surfaces Vanta expects before Umbra-backed
            wallet actions. This page does not enable signing or move funds.
          </p>
        </div>
        <div className="privacy-review-status" aria-label="Umbra benchmark status">
          <span>Umbra runtime</span>
          <strong>{snapshot.readiness.ready ? "Ready" : "Gated"}</strong>
          <small>{snapshot.prover.ready ? "Mixer prover ready" : "Mixer prover gated"}</small>
        </div>
      </div>

      <div className="privacy-review-grid">
        {snapshot.operationApprovalSamples.map((sample) => (
          <article className="privacy-review-card" key={sample.title}>
            <header>
              <span>{sample.walletPrompt}</span>
              <strong>{sample.title}</strong>
              <small>{sample.signingMode}</small>
            </header>

            <dl>
              {sample.rows.map((row) => (
                <div key={`${sample.title}-${row.label}`}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
