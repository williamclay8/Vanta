import { Link } from "react-router-dom";
import { AnonymityDepthDisclosure } from "@/components/AnonymityDepthDisclosure";
import { ProofLaneTrustPanel } from "@/components/ProofLaneTrustPanel";
import { ProofTrustPanels } from "@/components/ProofTrustPanels";

export function ProofPage() {
  return (
    <section className="proof-page" data-proof-route="/app/proof" aria-labelledby="proof-page-title">
      <header className="proof-page__header">
        <div>
          <span className="eyebrow">Proof</span>
          <h2 id="proof-page-title">Trust, readiness, and verification</h2>
          <p>
            Reviewer-facing truth for beta lanes: claim locks, trust packets, anonymity readiness,
            and the commands that reproduce operator status.
          </p>
        </div>
        <Link className="button button-ghost" to="/app/dashboard">
          Back to dashboard
        </Link>
      </header>

      <ProofLaneTrustPanel />
      <ProofTrustPanels />
      <AnonymityDepthDisclosure />

      <p className="proof-page__footer-note">
        Also see{" "}
        <Link to="/app/privacy-review">Privacy Review</Link> for Umbra approval samples.
      </p>
    </section>
  );
}
