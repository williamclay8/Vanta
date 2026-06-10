import { AssetPickerGrid, type AssetPickerGridOption } from "@/components/AssetPickerGrid";
import { ShieldLegacyMigrationSection } from "@/components/ShieldLegacyMigrationSection";
import { ShieldNativeSolRecoveryPanel } from "@/components/ShieldNativeSolRecoveryPanel";
import { RecoveryPanelController } from "@/components/RecoveryPanelController";
import { SafetyCallout } from "@/components/SafetyCallout";
import { TransactionStatusToast } from "@/components/TransactionStatusToast";
import { WalletApprovalSheet } from "@/components/WalletApprovalSheet";
import { describeRecentShieldCompletion } from "@/components/shield/shieldPanelUtils";
import type { RecentShieldContext } from "@/data/context/PrivacyFlowContext";
import type { NativeSolShieldDepositCandidate } from "@/solana/nativeSolShield";
import type { UmbraOperationApprovalDisplay } from "@/privacy/umbraOperations";
import type { createShieldAssetCapability } from "@/solana/shieldAssetCapability";
import type { LiveShieldTokenAssetKey } from "@/solana/shieldConfig";
import type { VantaShieldedSolNote } from "@/solana/vantaShieldState";
import { useState, type ComponentProps } from "react";

export type ShieldWorkspaceStatus =
  | "idle"
  | "awaiting_wallet_confirmation"
  | "routing_public_swap"
  | "shielding_in_progress"
  | "entering_shielded_state"
  | "recovery_recorded"
  | "complete"
  | "failed";

type ShieldCapability = ReturnType<typeof createShieldAssetCapability>;

type ShieldSourceAssetPreview = {
  decimals: number;
  symbol: string;
};

type ShieldOwnerContextPreview = {
  canRequestOwnerContext: boolean;
  ownerContext: unknown;
  status: string;
};

type SignatureWaitPreview = {
  detailLabel: string | null;
};

export type ShieldWorkspaceCardProps = {
  amount: string;
  capability: ShieldCapability;
  flowError: string | null;
  handleMigrateAllLegacyNotes: () => void | Promise<void>;
  handleMigrateLegacySolNote: (note: VantaShieldedSolNote) => void | Promise<void>;
  handleShield: () => void | Promise<void>;
  hasPendingNativeSolShieldEvidence: boolean;
  isAmountValid: boolean;
  isBetaMode: boolean;
  isMigratingAll: boolean;
  isNativeSolShield: boolean;
  latestRecoverableSolDeposit: NativeSolShieldDepositCandidate | null;
  legacyMigrationError: string | null;
  legacyMigrationStatus: Record<string, "idle" | "migrating" | "success" | "error">;
  legacySolNotes: VantaShieldedSolNote[];
  maxAvailableAmount: number;
  nativeSolShieldWait: SignatureWaitPreview;
  onBeginNativeSolShieldDepositRecovery: (deposit: NativeSolShieldDepositCandidate) => void;
  onClearLegacyPrompts: () => void;
  onHideLegacyMigrationPanel: () => void;
  onReshieldLegacyNote: (note: VantaShieldedSolNote) => void;
  onAmountChange: (value: string) => void;
  onMaxAmount: () => void;
  onSelectSourceAssetId: (assetId: string) => void;
  pendingShieldAsset: LiveShieldTokenAssetKey | "SOL" | null;
  pendingUmbraApprovalDisplay: UmbraOperationApprovalDisplay | null;
  recentShield: RecentShieldContext | null;
  recoverableSolDepositsError: string | null;
  recoverableSolDepositsLoading: boolean;
  routeLabel: string;
  routeProgressLabel: string | null;
  selectedSourceAsset: ShieldSourceAssetPreview | null;
  shieldOwnerContext: ShieldOwnerContextPreview;
  shieldTargetAssetPickerOptions: AssetPickerGridOption[];
  showLegacyMigrationPanel: boolean;
  sourceAssetPickerOptions: AssetPickerGridOption[];
  sourceBalanceLabel: string;
  sourcePlaceholderLabel: string;
  sourceSelectDisabled: boolean;
  sourceSelectValue: string;
  splShieldTransferWait: SignatureWaitPreview;
  status: ShieldWorkspaceStatus;
  targetShieldSymbol: string | undefined;
  targetShieldedBalanceLabel: string;
  targetShieldedBalanceReadUnavailable: boolean;
  validationMessage: string;
  viewingKey: ComponentProps<typeof RecoveryPanelController>["viewingKeyControls"];
  walletConnected: boolean;
};

export function ShieldWorkspaceCard({
  amount,
  capability,
  flowError,
  handleMigrateAllLegacyNotes,
  handleMigrateLegacySolNote,
  handleShield,
  hasPendingNativeSolShieldEvidence,
  isAmountValid,
  isBetaMode,
  isMigratingAll,
  isNativeSolShield,
  latestRecoverableSolDeposit,
  legacyMigrationError,
  legacyMigrationStatus,
  legacySolNotes,
  maxAvailableAmount,
  nativeSolShieldWait,
  onBeginNativeSolShieldDepositRecovery,
  onClearLegacyPrompts,
  onHideLegacyMigrationPanel,
  onReshieldLegacyNote,
  onAmountChange,
  onMaxAmount,
  onSelectSourceAssetId,
  pendingShieldAsset,
  pendingUmbraApprovalDisplay,
  recentShield,
  recoverableSolDepositsError,
  recoverableSolDepositsLoading,
  routeLabel,
  routeProgressLabel,
  selectedSourceAsset,
  shieldOwnerContext,
  shieldTargetAssetPickerOptions,
  showLegacyMigrationPanel,
  sourceAssetPickerOptions,
  sourceBalanceLabel,
  sourcePlaceholderLabel,
  sourceSelectDisabled,
  sourceSelectValue,
  splShieldTransferWait,
  status,
  targetShieldSymbol,
  targetShieldedBalanceLabel,
  targetShieldedBalanceReadUnavailable,
  validationMessage,
  viewingKey,
  walletConnected,
}: ShieldWorkspaceCardProps) {
  const [recoveryPanelOpen, setRecoveryPanelOpen] = useState(false);
  const shieldInFlight =
    status === "awaiting_wallet_confirmation" ||
    status === "routing_public_swap" ||
    status === "shielding_in_progress" ||
    status === "entering_shielded_state";

  return (
    <article className="send-card send-card--workspace">
      <div className="shield-card__header">
        <div>
          <span>Choose asset</span>
        </div>
      </div>

      <div className="shield-form swap-widget">
        <div className="swap-module">
          <div className="swap-module__field">
            <div className="swap-module__label-row">
              <span>Amount</span>
              <div className="send-balance-line shield-helper shield-helper--meta">
                Balance: {sourceBalanceLabel}
              </div>
            </div>
            <div className="send-entry-grid swap-entry-grid">
              <div className="amount-field">
                <input
                  id="shield-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => onAmountChange(event.target.value)}
                  placeholder="0.00"
                />
                <button
                  className="button button-ghost"
                  type="button"
                  disabled={maxAvailableAmount <= 0}
                  onClick={onMaxAmount}
                >
                  Max
                </button>
              </div>
            </div>
          </div>

          <div className="shield-from-to-row">
            <div className="swap-module__field shield-picker-column">
              <div className="swap-module__label-row">
                <span>From</span>
              </div>
              <AssetPickerGrid
                ariaLabel="Shield source asset"
                disabled={sourceSelectDisabled}
                emptyLabel={sourcePlaceholderLabel}
                onSelectOption={onSelectSourceAssetId}
                options={sourceAssetPickerOptions}
                selectedOptionId={sourceSelectValue}
              />
              <div className="shield-picker-footer" aria-hidden="true">
                <div className="send-balance-line shield-helper shield-helper--meta" style={{ visibility: "hidden" }}>
                  Shielded balance: placeholder
                </div>
                <div className="send-balance-line shield-helper shield-helper--meta" style={{ visibility: "hidden" }}>
                  Local SOL evidence pending ledger sync
                </div>
              </div>
            </div>

            <div className="shield-from-to-arrow" aria-hidden="true">
              →
            </div>

            <div className="swap-module__field shield-picker-column">
              <div className="swap-module__label-row">
                <span>To</span>
              </div>
              <AssetPickerGrid
                ariaLabel="Shield target asset"
                options={shieldTargetAssetPickerOptions}
                onSelectOption={() => undefined}
                readOnly
                selectedOptionId={shieldTargetAssetPickerOptions[0]?.id ?? ""}
              />
              <div className="shield-balance-stack shield-picker-footer">
                <div className="send-balance-line shield-helper shield-helper--meta">
                  Shielded balance: {targetShieldedBalanceLabel}
                </div>
                {hasPendingNativeSolShieldEvidence && (
                  <div className="send-balance-line shield-helper shield-helper--meta">
                    Local SOL evidence pending ledger sync
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="shield-helper shield-helper--route shield-route-below-pickers">
            Route: {selectedSourceAsset?.symbol ?? "Asset"} → {capability.targetShieldAsset?.label ?? "Shielded asset"}
          </p>

          <details className="shield-truth-drawer">
            <summary>Route details & beta status</summary>
            <p className="shield-helper shield-helper--meta">{routeLabel}</p>
            <p className="shield-helper shield-helper--meta">
              Beta. Vault is operator-controlled; program-owned custody is not yet wired.
            </p>
            {targetShieldedBalanceReadUnavailable && (
              <p className="shield-helper shield-helper--meta">
                Balance read delayed by RPC. Shield can still proceed.
              </p>
            )}
          </details>
          <p className="shield-helper shield-validation">{validationMessage}</p>
          {isNativeSolShield && (
            <ShieldNativeSolRecoveryPanel
              hasPendingNativeSolShieldEvidence={hasPendingNativeSolShieldEvidence}
              isBetaMode={isBetaMode}
              latestRecoverableSolDeposit={latestRecoverableSolDeposit}
              onBeginRecovery={onBeginNativeSolShieldDepositRecovery}
              recoverableSolDepositsError={recoverableSolDepositsError}
              recoverableSolDepositsLoading={recoverableSolDepositsLoading}
              status={status}
            />
          )}

          {isNativeSolShield && showLegacyMigrationPanel && (
            <ShieldLegacyMigrationSection
              handleMigrateAllLegacyNotes={handleMigrateAllLegacyNotes}
              handleMigrateLegacySolNote={handleMigrateLegacySolNote}
              isMigratingAll={isMigratingAll}
              legacyMigrationError={legacyMigrationError}
              legacyMigrationStatus={legacyMigrationStatus}
              legacySolNotes={legacySolNotes}
              onClearLegacyPrompts={onClearLegacyPrompts}
              onHideLegacyMigrationPanel={onHideLegacyMigrationPanel}
              onReshieldLegacyNote={onReshieldLegacyNote}
              walletConnected={walletConnected}
            />
          )}

          <SafetyCallout
            actionLabel="Back up now"
            onAction={() => {
              setRecoveryPanelOpen(true);
            }}
          >
            Back up your viewing key — it&apos;s the only way to restore shielded funds on
            another device or after clearing site data.{" "}
          </SafetyCallout>

          <RecoveryPanelController
            defaultOpen={recoveryPanelOpen}
            viewingKeyControls={viewingKey}
          />

          <div className="shield-form__actions shield-form__actions--primary">
            <button
              className={`button button-primary${shieldInFlight ? " button--loading" : ""}`}
              type="button"
              onClick={() => {
                void handleShield();
              }}
              disabled={
                isBetaMode ||
                !isAmountValid ||
                (!shieldOwnerContext.ownerContext && !shieldOwnerContext.canRequestOwnerContext) ||
                shieldOwnerContext.status === "requesting" ||
                status === "awaiting_wallet_confirmation" ||
                status === "routing_public_swap" ||
                status === "shielding_in_progress" ||
                status === "entering_shielded_state"
              }
            >
              {isBetaMode
                ? "Beta mode"
                : status === "awaiting_wallet_confirmation"
                  ? "Confirm in wallet…"
                  : shieldInFlight
                    ? "Shielding…"
                    : "Shield"}
            </button>
          </div>
        </div>

        {(status === "awaiting_wallet_confirmation" ||
          status === "routing_public_swap" ||
          status === "shielding_in_progress" ||
          status === "entering_shielded_state" ||
          status === "recovery_recorded" ||
          status === "complete" ||
          status === "failed") && (
          <TransactionStatusToast
            successIcon={
              status === "complete" || status === "recovery_recorded" ? "shield" : "default"
            }
            tone={
              status === "complete"
                ? "success"
                : status === "recovery_recorded"
                  ? "success"
                  : status === "failed"
                    ? "error"
                    : status === "awaiting_wallet_confirmation"
                      ? "pending"
                      : "processing"
            }
            phase={
              status === "complete" || status === "recovery_recorded"
                ? "complete"
                : status === "failed"
                  ? "failed"
                  : status === "awaiting_wallet_confirmation"
                    ? "pending"
                    : "confirmed"
            }
            title={
              status === "awaiting_wallet_confirmation"
                ? "Confirm in wallet"
                : status === "routing_public_swap"
                  ? "Routing to shield"
                  : status === "shielding_in_progress"
                    ? "Shielding"
                    : status === "entering_shielded_state"
                      ? "Recording state"
                      : status === "recovery_recorded"
                        ? "SOL recovery recorded"
                        : status === "complete"
                          ? recentShield?.claimTier === "proof_receipt_verified"
                            ? "Shield proof receipt verified"
                            : "Shield deposit recorded"
                          : "Shield failed"
            }
            message={
              status === "complete"
                ? recentShield
                  ? describeRecentShieldCompletion(recentShield, flowError)
                  : "The selected asset was recorded, but proof-backed Shield state was not confirmed."
                : status === "failed"
                  ? flowError ?? "The shield action could not be completed."
                  : status === "routing_public_swap"
                    ? `Routing ${selectedSourceAsset?.symbol ?? "the source asset"} into ${targetShieldSymbol ?? "the selected shield asset"} before entering Vanta.`
                    : status === "shielding_in_progress"
                      ? "Submitting the shield transfer into the Vanta vault."
                      : status === "entering_shielded_state"
                        ? "Recording local shield-state evidence."
                        : status === "recovery_recorded"
                          ? "No new transfer was submitted. Vanta saved the existing SOL vault deposit as pending recovery evidence; shielded balance updates after a verified shield-state note is available."
                          : "Approve the shield action in your wallet to continue."
            }
            progress={
              status !== "complete" &&
              status !== "failed" &&
              status !== "recovery_recorded"
            }
            floating
          >
            {pendingUmbraApprovalDisplay && status !== "complete" && status !== "failed" && (
              <WalletApprovalSheet
                heading="Vault transfer approval"
                walletPrompt={pendingUmbraApprovalDisplay.walletPrompt}
                signingMode={pendingUmbraApprovalDisplay.signingMode}
                rows={pendingUmbraApprovalDisplay.rows}
                note="Approve only if your wallet shows the same asset, amount, cluster, and destination."
                truthBoundary="Local review. Does not prove production privacy or mainnet readiness."
              />
            )}
            {status === "awaiting_wallet_confirmation" && (
              <div className="shield-wallet-warning-note" role="note">
                <strong>If your wallet warns you</strong>
                <p>
                  Phantom sometimes can't simulate this; we already did. Confirm only if
                  the asset, amount, cluster, and destination match what you see here.
                </p>
              </div>
            )}
            {routeProgressLabel && status === "routing_public_swap" && (
              <p className="shield-helper shield-helper--meta">{routeProgressLabel}</p>
            )}
            {(splShieldTransferWait.detailLabel || nativeSolShieldWait.detailLabel) &&
              status === "shielding_in_progress" && (
                <p className="shield-helper shield-helper--meta">
                  {pendingShieldAsset === "SOL"
                    ? nativeSolShieldWait.detailLabel
                    : splShieldTransferWait.detailLabel}
                </p>
              )}
          </TransactionStatusToast>
        )}
      </div>
    </article>
  );
}
