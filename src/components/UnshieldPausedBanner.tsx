import { Link } from "react-router-dom";

export function UnshieldPausedBanner() {
  return (
    <aside
      className="unshield-paused-banner"
      role="status"
      aria-live="polite"
      data-marker="unshield-withdrawals-paused-banner"
    >
      <strong>Withdrawals are temporarily paused.</strong>
      <p>
        The operator-signed unshield path has been removed in this build so that no single key can
        move shielded funds. Withdrawals will resume once the on-chain proof verifier is deployed
        and <code>pool_state.verifier_wired</code> can be flipped through a reviewed, audited
        setter. There is no fixed ship date yet — progress follows the Band 3 verifier ceremony on
        our <Link to="/docs/roadmap">roadmap</Link>. Until then the operator returns{" "}
        <code>HTTP 503</code> for every unshield request — this is the intended fail-closed
        posture, not an outage. <Link to="/docs/security">Read current security limits</Link>.
      </p>
    </aside>
  );
}
