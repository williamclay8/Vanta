import { isBetaMode } from "@/config/deploymentMode";
import type { UnshieldLane } from "@/components/unshield/unshieldPanelUtils";
import type { LiveShieldTokenAssetKey } from "@/solana/shieldConfig";

type BuildUnshieldValidationMessageArgs = {
  isRefreshingRegistry: boolean;
  requestedAmountNumeric: number | null;
  requiresExactSplit: boolean;
  selectedFullAmount: number;
  selectedLane: UnshieldLane;
  selectedShieldAsset: {
    assetKey: LiveShieldTokenAssetKey;
    mintAddress: string | null | undefined;
    unshieldConfigured: boolean | undefined;
    unshieldOperatorUrl: string | null | undefined;
    vaultOwner: string | null | undefined;
  } | null;
  selectedShieldEntryError: string | null | undefined;
  selectedShieldNote: { amount: number } | null;
  selectedSolNote: { amount: number } | null;
  selectedSolPendingAmount: number;
  solShieldStateError: string | null;
  solUnshieldOperatorHealth: "idle" | "checking" | "ready" | "blocked";
  solUnshieldOperatorHealthError: string | null;
  solUnshieldOperatorUrl: string | null | undefined;
  walletConnected: boolean;
};

export function buildUnshieldValidationMessage({
  isRefreshingRegistry,
  requestedAmountNumeric,
  requiresExactSplit,
  selectedFullAmount,
  selectedLane,
  selectedShieldAsset,
  selectedShieldEntryError,
  selectedShieldNote,
  selectedSolNote,
  selectedSolPendingAmount,
  solShieldStateError,
  solUnshieldOperatorHealth,
  solUnshieldOperatorHealthError,
  solUnshieldOperatorUrl,
  walletConnected,
}: BuildUnshieldValidationMessageArgs) {
  let validationMessage =
    selectedLane === "SOL"
      ? "Return shielded SOL to your public wallet through the constrained operator path."
      : selectedLane === "USDC" && requiresExactSplit
        ? "Vanta will split your protected USDC balance privately, keep the remainder shielded, and return only the requested amount."
        : `Return shielded ${selectedLane} to your public wallet through the constrained operator path.`;

  if (!walletConnected) {
    validationMessage = "Connect a wallet so Unshield can release back to your own wallet.";
  } else if (isBetaMode) {
    validationMessage =
      "Beta mode keeps Unshield visible but prevents live withdrawals while production services are offline.";
  } else if (isRefreshingRegistry) {
    validationMessage = "Refreshing wallet and Vanta state from mainnet.";
  } else if (selectedLane === "SOL" && solShieldStateError) {
    validationMessage = solShieldStateError;
  } else if (selectedLane !== "SOL" && selectedShieldEntryError) {
    validationMessage = selectedShieldEntryError;
  } else if (selectedLane === "SOL" && !selectedSolNote && selectedSolPendingAmount > 0) {
    validationMessage =
      "Please wait for ledger reconciliation; local SOL evidence pending ledger sync.";
  } else if (selectedLane === "SOL" && !solUnshieldOperatorUrl) {
    validationMessage = "Configure the SOL unshield operator endpoint before shielded SOL can exit.";
  } else if (selectedLane === "SOL" && solUnshieldOperatorHealth === "checking") {
    validationMessage = "Checking the SOL unshield operator endpoint before enabling the exit.";
  } else if (selectedLane === "SOL" && solUnshieldOperatorHealth === "blocked") {
    validationMessage =
      solUnshieldOperatorHealthError ??
      "The SOL unshield operator endpoint is configured but not ready for release.";
  } else if (selectedLane !== "SOL" && !selectedShieldAsset?.unshieldOperatorUrl) {
    validationMessage = `Configure the ${selectedLane} unshield operator endpoint before this asset can exit.`;
  } else if (selectedLane !== "SOL" && !selectedShieldAsset?.mintAddress) {
    validationMessage = `${selectedLane} is not configured as a live unshield asset yet.`;
  } else if (selectedLane !== "SOL" && !selectedShieldAsset?.vaultOwner) {
    validationMessage = `Configure the ${selectedLane} vault owner before this asset can exit.`;
  } else if (selectedLane !== "SOL" && !selectedShieldAsset?.unshieldConfigured) {
    validationMessage = `${selectedLane} unshield is not ready for this wallet state yet.`;
  } else if (selectedLane !== "SOL" && !selectedShieldNote) {
    validationMessage = `No ledger-spendable shielded ${selectedLane} note is currently available to return.`;
  } else if (selectedLane === "SOL" && !selectedSolNote) {
    validationMessage = "No ledger-spendable shielded SOL note is currently available to return.";
  } else if (selectedLane === "USDC" && requestedAmountNumeric === null) {
    validationMessage = "Enter a valid USDC amount to unshield.";
  } else if (requiresExactSplit) {
    validationMessage = "For Phantom safety, shield the exact USDC amount first before unshielding.";
  } else if (
    selectedLane === "USDC" &&
    requestedAmountNumeric !== null &&
    requestedAmountNumeric <= 0
  ) {
    validationMessage = "Unshield amount must be greater than zero.";
  } else if (
    selectedLane === "USDC" &&
    requestedAmountNumeric !== null &&
    requestedAmountNumeric > selectedFullAmount
  ) {
    validationMessage = "Unshield amount cannot exceed the selected ledger-spendable note.";
  }

  return validationMessage;
}
