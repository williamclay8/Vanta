import type { ReactNode } from "react";

export type RecoveryPanelStatusItem = {
  label: string;
  value: ReactNode;
};

type RecoveryPanelProps = {
  canExportRecordSource: boolean;
  canResetRecoveryKey: boolean;
  canRestoreBackup: boolean;
  canShowBackup: boolean;
  canVerifyRecordSource: boolean;
  description: ReactNode;
  detailNotes: readonly ReactNode[];
  recordSourceImportText: string;
  recordSourcePacketText: string;
  recordSourceStatusDetail?: ReactNode;
  recordSourceStatusLabel?: ReactNode;
  recoveryRows: readonly RecoveryPanelStatusItem[];
  statusItems: readonly RecoveryPanelStatusItem[];
  summaryLabel: ReactNode;
  summaryValue: ReactNode;
  viewingKeyBackupText: string;
  viewingKeyImportText: string;
  viewingKeyStatusMessage?: ReactNode;
  onExportRecordSource: () => void;
  onRecordSourceImportTextChange: (value: string) => void;
  onResetRecoveryKey: () => void;
  onRestoreBackup: () => void;
  onShowBackup: () => void;
  onVerifyRecordSource: () => void;
  onViewingKeyImportTextChange: (value: string) => void;
};

export function RecoveryPanel({
  canExportRecordSource,
  canResetRecoveryKey,
  canRestoreBackup,
  canShowBackup,
  canVerifyRecordSource,
  description,
  detailNotes,
  recordSourceImportText,
  recordSourcePacketText,
  recordSourceStatusDetail,
  recordSourceStatusLabel,
  recoveryRows,
  statusItems,
  summaryLabel,
  summaryValue,
  viewingKeyBackupText,
  viewingKeyImportText,
  viewingKeyStatusMessage,
  onExportRecordSource,
  onRecordSourceImportTextChange,
  onResetRecoveryKey,
  onRestoreBackup,
  onShowBackup,
  onVerifyRecordSource,
  onViewingKeyImportTextChange,
}: RecoveryPanelProps) {
  const recoveryPanelStatusItems = statusItems;

  return (
    <details className="recovery-panel">
      <summary>
        <span>{summaryLabel}</span>
        <strong>{summaryValue}</strong>
      </summary>
      <div className="recovery-panel__body">
        <p className="shield-helper shield-helper--meta">{description}</p>
        <div className="recovery-panel__summary-grid" aria-label="Advanced shield settings status">
          {recoveryPanelStatusItems.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <div className="review-list">
          {recoveryRows.map((row) => (
            <div className="review-row" key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
        {detailNotes.map((note, index) => (
          <p className="shield-helper shield-helper--meta" key={index}>
            {note}
          </p>
        ))}
        <div className="recovery-panel__actions">
          <button
            className="button button-ghost"
            type="button"
            disabled={!canExportRecordSource}
            onClick={onExportRecordSource}
          >
            Export record source
          </button>
          <button
            className="button button-ghost"
            type="button"
            disabled={!canVerifyRecordSource}
            onClick={onVerifyRecordSource}
          >
            Verify record source
          </button>
        </div>
        <label className="recovery-panel__field">
          <span>Record source packet</span>
          <textarea
            readOnly
            value={recordSourcePacketText}
            placeholder="Export record source to reveal non-secret record references for another browser."
          />
        </label>
        <label className="recovery-panel__field">
          <span>Import record source packet</span>
          <textarea
            value={recordSourceImportText}
            onChange={(event) => {
              onRecordSourceImportTextChange(event.target.value);
            }}
            placeholder="Paste a record source packet from another browser."
          />
        </label>
        {recordSourceStatusLabel && (
          <p className="shield-helper shield-helper--meta">
            <strong>{recordSourceStatusLabel}</strong>
            {recordSourceStatusDetail ? ` - ${recordSourceStatusDetail}` : ""}
          </p>
        )}
        <div className="recovery-panel__actions">
          <button
            className="button button-ghost"
            type="button"
            disabled={!canShowBackup}
            onClick={onShowBackup}
          >
            Show backup
          </button>
          <button
            className="button button-ghost"
            type="button"
            disabled={!canRestoreBackup}
            onClick={onRestoreBackup}
          >
            Restore backup
          </button>
          <button
            className="button button-ghost"
            type="button"
            disabled={!canResetRecoveryKey}
            onClick={onResetRecoveryKey}
          >
            Reset recovery key
          </button>
        </div>
        <label className="recovery-panel__field">
          <span>Recovery backup</span>
          <textarea
            readOnly
            value={viewingKeyBackupText}
            placeholder="Show backup to reveal this browser's recovery key."
          />
        </label>
        <label className="recovery-panel__field">
          <span>Restore on this browser</span>
          <textarea
            value={viewingKeyImportText}
            onChange={(event) => {
              onViewingKeyImportTextChange(event.target.value);
            }}
            placeholder="Paste a recovery backup from another browser."
          />
        </label>
        {viewingKeyStatusMessage && (
          <p className="shield-helper shield-helper--meta">{viewingKeyStatusMessage}</p>
        )}
      </div>
    </details>
  );
}
