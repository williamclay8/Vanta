import { RecoveryPanelController } from "@/components/RecoveryPanelController";

export function RecoverySettingsPage() {
  return (
    <section
      className="send-page shield-page recovery-settings-page"
      data-vanta-recovery-settings-route
    >
      <div className="module-page__hero send-page__hero product-intro">
        <div>
          <span className="eyebrow product-intro__eyebrow">Keys & records</span>
          <h2>Recovery settings</h2>
          <p>
            Back up this browser's viewing-key material and verify non-secret record source
            packets for shielded-note discovery.
          </p>
        </div>

        <div className="module-state">
          <strong>Beta recovery boundary</strong>
          <p>
            These controls help another browser inspect matching local records after import. They
            do not enable recovery production privacy or recover missing wallet secrets.
          </p>
        </div>
      </div>

      <div className="send-layout recovery-settings-page__layout">
        <article className="send-card send-card--workspace recovery-settings-page__workspace">
          <div className="shield-card__header">
            <div>
              <span>Viewing-key backup</span>
            </div>
          </div>
          <RecoveryPanelController
            defaultOpen
            mode="settings"
            description="Viewing-key backup and record source import help this browser recognize local Shield, Send, and Swap records. Import still needs matching non-secret record sources; legacy browser-local records stay quarantined."
          />
        </article>
      </div>
    </section>
  );
}
