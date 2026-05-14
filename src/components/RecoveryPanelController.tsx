import { useCallback, useState, type ReactNode } from "react";
import {
  RecoveryPanel,
  type RecoveryPanelStatusItem,
} from "@/components/RecoveryPanel";
import { useWalletState } from "@/data/context/WalletContext";
import { useVantaShieldOwnerContext } from "@/solana/useVantaShieldOwnerContext";
import {
  useVantaShieldViewingKey,
  type VantaShieldViewingKeyControls,
} from "@/solana/useVantaShieldViewingKey";
import { toVantaWalletAuthorizationRecoveryMessage } from "@/wallet/walletAuthorizationError.mjs";
import { listCanonicalShieldRecords } from "@/zk/liveShieldBridge";
import { listCanonicalSendRecords } from "@/zk/liveSendBridge";
import { listCanonicalSwapRecords } from "@/zk/liveSwapBridge";
import { isWalletDerivedOwnerContext } from "@/zk/ownerContextRecoveryEvidence";
import {
  createOwnerContextRecordSourceImportPacket,
  parseOwnerContextRecordSourceImportPacketText,
  summarizeOwnerContextRecordSourceImportPacket,
  verifyOwnerContextRecordSourceImport,
  type OwnerContextRecordSourceImportStatus,
  type OwnerContextRecordSourceInput,
} from "@/zk/ownerContextRecordSourceImport";

type RecordSourceImportUiStatus =
  | "idle"
  | "exported"
  | "no-local-records"
  | "malformed-json"
  | "needs-owner-context"
  | "failed"
  | OwnerContextRecordSourceImportStatus;

type RecoveryPanelControllerMode = "settings" | "shield";

type RecoveryPanelControllerProps = {
  defaultOpen?: boolean;
  description?: ReactNode;
  mode?: RecoveryPanelControllerMode;
  summaryLabel?: ReactNode;
  viewingKeyControls?: VantaShieldViewingKeyControls | null;
};

function createLocalRecordSourceImportInputs(): OwnerContextRecordSourceInput[] {
  const shieldInputs: OwnerContextRecordSourceInput[] = listCanonicalShieldRecords().map(
    (record) => ({
      recordId: record.recordId,
      source: record.source,
      ownerContextEvidence: record.ownerContextEvidence,
      redactedOwnerContext: record.redactedOwnerContext,
      canonicalNote: { ownerPublicKey: record.canonicalNote.ownerPublicKey },
    }),
  );
  const sendInputs: OwnerContextRecordSourceInput[] = listCanonicalSendRecords().flatMap(
    (record) => [
      {
        recordId: record.recordId,
        source: record.source,
        ownerContextEvidence: record.ownerContextEvidence,
      },
      ...record.successors.map((successor, index) => ({
        recordId: [
          record.recordId,
          successor.kind,
          successor.liveNoteReferenceHash ?? successor.insertion.index ?? index,
        ].join(":"),
        source: record.source,
        ownerContextEvidence: successor.ownerContextEvidence,
        canonicalNote: successor.canonicalNote
          ? { ownerPublicKey: successor.canonicalNote.ownerPublicKey }
          : undefined,
      })),
    ],
  );
  const swapInputs: OwnerContextRecordSourceInput[] = listCanonicalSwapRecords().flatMap(
    (record) => [
      {
        recordId: record.recordId,
        source: record.source,
        ownerContextEvidence: record.ownerContextEvidence,
      },
      {
        recordId: `${record.recordId}:output`,
        source: record.source,
        ownerContextEvidence: record.outputSuccessor.ownerContextEvidence,
        canonicalNote: {
          ownerPublicKey: record.outputSuccessor.canonicalNote.ownerPublicKey,
        },
      },
    ],
  );

  return [...shieldInputs, ...sendInputs, ...swapInputs];
}

function formatRecordSourceImportStatusLabel(status: RecordSourceImportUiStatus) {
  switch (status) {
    case "idle":
      return "";
    case "exported":
      return "record source exported";
    case "no-local-records":
      return "no local records";
    case "malformed-json":
      return "packet unreadable";
    case "needs-owner-context":
      return "owner context required";
    case "wallet-derived-import-source-verified":
      return "wallet-derived import verified";
    case "wallet-derived-record-source-mismatch":
      return "wallet-derived record source mismatch";
    case "legacy-record-source-local-only":
      return "legacy record source local-only";
    case "missing-record-source":
      return "missing record source";
    case "raw-owner-material-rejected":
      return "raw owner material rejected";
    case "failed":
      return "record source check failed";
  }
}

function toRecoveryErrorMessage(error: unknown, fallback: string) {
  const walletAuthorizationMessage = toVantaWalletAuthorizationRecoveryMessage(error);

  if (walletAuthorizationMessage) {
    return walletAuthorizationMessage;
  }

  return error instanceof Error ? error.message : fallback;
}

export function RecoveryPanelController({
  defaultOpen = false,
  description,
  mode = "shield",
  summaryLabel,
  viewingKeyControls,
}: RecoveryPanelControllerProps) {
  const { walletConnected } = useWalletState();
  const localViewingKey = useVantaShieldViewingKey();
  const viewingKey = viewingKeyControls ?? localViewingKey;
  const shieldOwnerContext = useVantaShieldOwnerContext();
  const [viewingKeyBackupText, setViewingKeyBackupText] = useState("");
  const [viewingKeyImportText, setViewingKeyImportText] = useState("");
  const [viewingKeyCustodyStatus, setViewingKeyCustodyStatus] = useState<
    "idle" | "exported" | "imported" | "reset" | "failed"
  >("idle");
  const [recordSourcePacketText, setRecordSourcePacketText] = useState("");
  const [recordSourceImportText, setRecordSourceImportText] = useState("");
  const [recordSourceImportStatus, setRecordSourceImportStatus] =
    useState<RecordSourceImportUiStatus>("idle");
  const [recordSourceImportDetail, setRecordSourceImportDetail] = useState("");

  const exportRecordSourcePacket = useCallback(() => {
    try {
      const records = createLocalRecordSourceImportInputs();

      if (records.length === 0) {
        setRecordSourcePacketText("");
        setRecordSourceImportStatus("no-local-records");
        setRecordSourceImportDetail(
          "No local Shield, Send, or Swap record evidence is available to export from this browser.",
        );
        return;
      }

      const packet = createOwnerContextRecordSourceImportPacket({ records });
      const summary = summarizeOwnerContextRecordSourceImportPacket(packet);
      setRecordSourcePacketText(JSON.stringify(packet, null, 2));
      setRecordSourceImportStatus("exported");
      setRecordSourceImportDetail(
        `Record source packet ready with ${summary?.recordCount ?? packet.entries.length} non-secret record references. ${summary?.quarantinedLocalOnlyCount ?? 0} records remain quarantined local-only. It is not a recovery-secret backup.`,
      );
    } catch (error) {
      setRecordSourceImportStatus("failed");
      setRecordSourceImportDetail(
        toRecoveryErrorMessage(error, "Record source packet could not be exported."),
      );
    }
  }, []);

  const verifyRecordSourcePacket = useCallback(async () => {
    const serializedPacket = recordSourceImportText.trim();

    if (!serializedPacket) {
      setRecordSourceImportStatus("missing-record-source");
      setRecordSourceImportDetail("Paste a record source packet before verifying it.");
      return;
    }

    try {
      JSON.parse(serializedPacket) as unknown;
    } catch {
      setRecordSourceImportStatus("malformed-json");
      setRecordSourceImportDetail("That record source packet is not valid JSON.");
      return;
    }

    const normalizedPacket = parseOwnerContextRecordSourceImportPacketText(serializedPacket);

    if (!shieldOwnerContext.ownerContext && !shieldOwnerContext.canRequestOwnerContext) {
      setRecordSourceImportStatus("needs-owner-context");
      setRecordSourceImportDetail(
        "Connect a message-signing wallet before verifying a second-device record source packet.",
      );
      return;
    }

    try {
      const ownerContext =
        shieldOwnerContext.ownerContext ?? (await shieldOwnerContext.ensureOwnerContext());
      const proof = verifyOwnerContextRecordSourceImport({
        ownerContext,
        packet: normalizedPacket,
      });
      const summary = summarizeOwnerContextRecordSourceImportPacket(normalizedPacket);
      setRecordSourceImportStatus(proof.status);
      setRecordSourceImportDetail(
        `${proof.truth} Matched ${proof.matchedRecordCount} of ${proof.walletDerivedCandidateCount} wallet-derived candidates${summary ? ` across ${summary.recordCount} record references with ${summary.quarantinedLocalOnlyCount} quarantined local-only records` : ""}.`,
      );
    } catch (error) {
      setRecordSourceImportStatus("failed");
      setRecordSourceImportDetail(
        toRecoveryErrorMessage(error, "Record source packet could not be verified."),
      );
    }
  }, [
    recordSourceImportText,
    shieldOwnerContext.canRequestOwnerContext,
    shieldOwnerContext.ensureOwnerContext,
    shieldOwnerContext.ownerContext,
  ]);

  const ownerRecoveryEvidenceLabel = shieldOwnerContext.ownerContext
    ? isWalletDerivedOwnerContext(shieldOwnerContext.ownerContext)
      ? "wallet-derived candidate"
      : "legacy local-only"
    : shieldOwnerContext.canRequestOwnerContext
      ? "needs wallet approval"
      : "unavailable";
  const ownerRecoveryEvidenceDetail = shieldOwnerContext.ownerContext
    ? isWalletDerivedOwnerContext(shieldOwnerContext.ownerContext)
      ? "Fresh Shield records retain non-secret wallet-derived evidence; another device still needs an imported record source before recovery is real."
      : "Fresh Shield records from this context are quarantined as legacy local-only; record-source import does not promote them to cross-device recovery."
    : shieldOwnerContext.canRequestOwnerContext
      ? "Approve the owner-key message before Shield records can carry non-secret recovery evidence."
      : "This wallet session cannot create owner recovery evidence until message signing is available.";
  const recordSourceImportProofLabel = shieldOwnerContext.ownerContext
    ? isWalletDerivedOwnerContext(shieldOwnerContext.ownerContext)
      ? "record source required"
      : "legacy local-only"
    : "not ready";
  const recordSourceImportProofDetail = shieldOwnerContext.ownerContext
    ? isWalletDerivedOwnerContext(shieldOwnerContext.ownerContext)
      ? "A second device can only prove the same owner context after importing a non-secret record source packet; viewing-key backup may still be required for memo discovery."
      : "Legacy local-only records are not promoted by the record source import proof."
    : "Record source import proof starts after wallet-derived owner evidence exists.";
  const legacyQuarantinePolicyLabel = "automatic migration off";
  const legacyQuarantinePolicyDetail =
    "Old random-seeded browser-local records stay quarantined local-only. Record-source import verifies wallet-derived records but does not promote legacy records or recover missing secrets.";

  const showViewingKeyBackup = () => {
    if (!viewingKey) {
      return;
    }

    setViewingKeyBackupText(viewingKey.exportText);
    setViewingKeyCustodyStatus("exported");
  };
  const restoreViewingKeyBackup = () => {
    if (!viewingKey) {
      return;
    }

    try {
      viewingKey.importText(viewingKeyImportText);
      setViewingKeyBackupText("");
      setViewingKeyImportText("");
      setViewingKeyCustodyStatus("imported");
    } catch {
      setViewingKeyCustodyStatus("failed");
    }
  };
  const resetViewingKeyBackup = () => {
    if (!viewingKey) {
      return;
    }

    viewingKey.reset();
    setViewingKeyBackupText("");
    setViewingKeyImportText("");
    setViewingKeyCustodyStatus("reset");
  };
  const viewingKeyStatusMessage =
    viewingKeyCustodyStatus === "exported"
      ? "Backup shown. Store it somewhere private."
      : viewingKeyCustodyStatus === "imported"
        ? "Recovery key restored."
        : viewingKeyCustodyStatus === "reset"
          ? "New recovery key created. Existing notes may need the old backup to appear."
          : viewingKeyCustodyStatus === "failed"
            ? "Could not restore that backup."
            : undefined;

  const statusItems: readonly RecoveryPanelStatusItem[] =
    mode === "settings"
      ? [
          { label: "Viewing key backup", value: viewingKey ? "Available" : "Connect wallet" },
          { label: "Record source", value: walletConnected ? "Export available" : "Connect wallet" },
          { label: "Legacy records", value: "Quarantined local-only" },
        ]
      : [
          { label: "Viewing key backup", value: viewingKey ? "Available" : "Connect wallet" },
          { label: "Decoy batch", value: "Automatic" },
          { label: "Custom route", value: "Default route" },
        ];

  return (
    <RecoveryPanel
      summaryLabel={summaryLabel ?? (mode === "settings" ? "Recovery settings" : "Advanced shield settings")}
      summaryValue={viewingKey ? "Recovery ready" : "Connect wallet"}
      description={
        description ??
        "Lets this browser recognize your shielded notes. Back it up if you use Vanta on another device."
      }
      defaultOpen={defaultOpen}
      statusItems={statusItems}
      recoveryRows={[
        { label: "Owner recovery evidence", value: ownerRecoveryEvidenceLabel },
        { label: "Record source import proof", value: recordSourceImportProofLabel },
        { label: "Legacy quarantine policy", value: legacyQuarantinePolicyLabel },
      ]}
      detailNotes={[
        ownerRecoveryEvidenceDetail,
        recordSourceImportProofDetail,
        legacyQuarantinePolicyDetail,
        "Viewing keys are stored in this browser's localStorage. Clearing site data, changing browsers, or losing the backup can make local notes undiscoverable until a valid backup and record source packet are imported.",
      ]}
      canExportRecordSource={walletConnected}
      canVerifyRecordSource={
        walletConnected &&
        recordSourceImportText.trim() !== "" &&
        (Boolean(shieldOwnerContext.ownerContext) || shieldOwnerContext.canRequestOwnerContext)
      }
      recordSourcePacketText={recordSourcePacketText}
      recordSourceImportText={recordSourceImportText}
      recordSourceStatusLabel={
        recordSourceImportStatus !== "idle"
          ? formatRecordSourceImportStatusLabel(recordSourceImportStatus)
          : undefined
      }
      recordSourceStatusDetail={recordSourceImportDetail}
      onExportRecordSource={exportRecordSourcePacket}
      onVerifyRecordSource={() => {
        void verifyRecordSourcePacket();
      }}
      onRecordSourceImportTextChange={(value) => {
        setRecordSourceImportText(value);
        setRecordSourceImportStatus("idle");
        setRecordSourceImportDetail("");
      }}
      canShowBackup={Boolean(viewingKey)}
      canRestoreBackup={Boolean(viewingKey) && viewingKeyImportText.trim() !== ""}
      canResetRecoveryKey={Boolean(viewingKey)}
      viewingKeyBackupText={viewingKeyBackupText}
      viewingKeyImportText={viewingKeyImportText}
      viewingKeyStatusMessage={viewingKeyStatusMessage}
      onShowBackup={showViewingKeyBackup}
      onRestoreBackup={restoreViewingKeyBackup}
      onResetRecoveryKey={resetViewingKeyBackup}
      onViewingKeyImportTextChange={(value) => {
        setViewingKeyImportText(value);
        setViewingKeyCustodyStatus("idle");
      }}
    />
  );
}
