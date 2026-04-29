import { createVantaActualPrivateSettlementBrowserHandoff } from "@/mainnet/actualPrivateSettlementBrowserHandoff";
import { useWalletState } from "@/data/context/WalletContext";

export function ActualPrivateSettlementPage() {
  const handoff = createVantaActualPrivateSettlementBrowserHandoff();
  const { walletAddressShort, walletConnected, walletReady } = useWalletState();
  const walletStatus = !walletReady
    ? "Checking"
    : walletConnected
      ? (walletAddressShort ?? "Connected")
      : "Connect wallet";

  return (
    <section
      className="privacy-review-page actual-private-settlement-page"
      data-actual-private-settlement-route={handoff.browserRoute}
      data-live-submission-enabled={String(handoff.liveSubmissionEnabled)}
      aria-labelledby="actual-private-settlement-title"
    >
      <div className="privacy-review-hero">
        <div>
          <span className="eyebrow">Mainnet evidence handoff</span>
          <h2 id="actual-private-settlement-title">Actual-private settlement</h2>
          <p>
            This browser session is the reviewed handoff for the wallet-signed deposit side of
            the live evidence run. It keeps private-key material out of the CLI and keeps the
            private spend on the relayer path.
          </p>
        </div>
        <div className="privacy-review-status" aria-label="Live submission status">
          <span>Live submit</span>
          <strong>{handoff.liveSubmissionEnabled ? "Enabled" : "Preflight"}</strong>
          <small>{walletStatus}</small>
        </div>
      </div>

      <div className="privacy-review-grid">
        <article className="privacy-review-card">
          <header>
            <span>Source wallet</span>
            <strong>Public deposit only</strong>
            <small>{handoff.depositSigner}</small>
          </header>
          <dl>
            <div>
              <dt>Boundary</dt>
              <dd>safe-send browser session</dd>
            </div>
            <div>
              <dt>CLI keys</dt>
              <dd>not allowed</dd>
            </div>
            <div>
              <dt>Submission</dt>
              <dd>disabled in this slice</dd>
            </div>
          </dl>
        </article>

        <article className="privacy-review-card">
          <header>
            <span>Private spend</span>
            <strong>Relayer submitted</strong>
            <small>{handoff.spendSigner}</small>
          </header>
          <dl>
            <div>
              <dt>Submitter</dt>
              <dd>{handoff.privateSpendSubmitter}</dd>
            </div>
            <div>
              <dt>Source wallet</dt>
              <dd>forbidden as fee payer</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>refs only</dd>
            </div>
          </dl>
        </article>

        <article className="privacy-review-card">
          <header>
            <span>Required boundaries</span>
            <strong>Before live submit</strong>
            <small>{handoff.version}</small>
          </header>
          <dl>
            {handoff.requiredBoundaries.map((boundary) => (
              <div key={boundary}>
                <dt>Gate</dt>
                <dd>{boundary}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="privacy-review-card">
          <header>
            <span>Evidence refs</span>
            <strong>Settlement packet</strong>
            <small>{handoff.cliPreflightCommand}</small>
          </header>
          <dl>
            {handoff.requiredEvidenceRefs.slice(0, 5).map((ref) => (
              <div key={ref}>
                <dt>Ref</dt>
                <dd>{ref}</dd>
              </div>
            ))}
          </dl>
        </article>
      </div>
    </section>
  );
}
