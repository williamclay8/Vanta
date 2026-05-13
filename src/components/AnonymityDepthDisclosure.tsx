import { getVantaPrivatePoolV2AnonymityDisclosure } from "@/privacy/privatePoolV2AnonymityDisclosure";

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function AnonymityDepthDisclosure() {
  const disclosure = getVantaPrivatePoolV2AnonymityDisclosure();
  const currentCount = formatCount(disclosure.currentDistinctCommitmentCount);
  const threshold = formatCount(disclosure.minimumDistinctCommitments);

  return (
    <section className="landing-depth-disclosure" aria-label="Private Pool v2 anonymity disclosure">
      <div className="landing-depth-disclosure__copy">
        <span>Anonymity readiness: blocked</span>
        <h2>Current pool depth is below the privacy threshold.</h2>
        <p>
          Current reviewed spend evidence reports {currentCount} distinct commitments toward
          the {threshold} minimum. Vanta does not claim live anonymity or production-private
          mainnet settlement yet.
        </p>
      </div>

      <div className="landing-depth-disclosure__metrics" aria-label="Current anonymity depth">
        <div>
          <strong>{currentCount}</strong>
          <span>Evidence-recorded commitments</span>
        </div>
        <div>
          <strong>{threshold}</strong>
          <span>Required minimum</span>
        </div>
        <div>
          <strong>Blocked</strong>
          <span>{disclosure.currentMeasurementStatus.replace(/-/gu, " ")}</span>
        </div>
      </div>

      <div className="landing-depth-disclosure__evidence">
        <span>Evidence</span>
        <code>{disclosure.sourceEvidencePath}</code>
        <code>{disclosure.readinessCheck}</code>
      </div>
    </section>
  );
}
