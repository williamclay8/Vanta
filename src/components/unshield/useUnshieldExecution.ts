import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSolanaClient, useWalletSession } from "@solana/react-hooks";
import { isBetaMode } from "@/config/deploymentMode";
import { formatEditableAmount } from "@/components/shield/shieldPanelUtils";
import type { UnshieldLane } from "@/components/unshield/unshieldPanelUtils";
import type {
  PendingSplitFollowup,
  PendingSplitMarker,
  PendingSpentMarker,
  PendingUnshieldBridge,
  PreparedWalletApproval,
  UnshieldCompletion,
  UnshieldStatus,
} from "@/components/unshield/unshieldExecutionTypes";
import {
  amountsRoughlyMatch,
  assertCanonicalSolSpendableNote,
  assertCanonicalTokenSpendableNote,
  parseDecimalAmountToBaseUnits,
} from "@/components/unshield/unshieldNoteUtils";
import { createUmbraUnshieldActionApprovalReview } from "@/privacy/umbraUnshieldActionReview";
import type { UmbraOperationApprovalDisplay } from "@/privacy/umbraOperations";
import { buildHeliusPriorityFeeInstructions } from "@/solana/heliusPriorityFees";
import { useRealtimeSignatureProgress } from "@/solana/useRealtimeSignatureProgress";
import {
  createSolUnshieldIntentPayload,
  signSolUnshieldIntent,
  VANTA_SOL_UNSHIELD_INTENT_TTL_MS,
} from "@/solana/solUnshieldAuth";
import { requestOperatorSolUnshield } from "@/solana/solUnshieldOperatorClient";
import {
  getLiveShieldTokenAsset,
  liveSwapPair,
  type LiveShieldTokenAssetKey,
  vantaExplicitMainnetApproval,
  vantaSolanaCluster,
} from "@/solana/shieldConfig";
import {
  createUnshieldIntentPayload,
  signUnshieldIntent,
  VANTA_UNSHIELD_INTENT_TTL_MS,
} from "@/solana/unshieldAuth";
import { requestOperatorUnshield } from "@/solana/unshieldOperatorClient";
import type { useVantaShieldAssetRegistryState } from "@/solana/useVantaShieldAssetRegistryState";
import type { useVantaShieldViewingKey } from "@/solana/useVantaShieldViewingKey";
import {
  createPreparedSendMemo,
  createSpentMarkerInstruction,
  fetchVantaShieldAccountState,
} from "@/solana/vantaShieldState";
import { listCanonicalUnshieldDiagnosticsSummaries, recordCanonicalUnshieldFromLiveUnshield } from "@/zk/liveUnshieldBridge";
import { useVantaSafeSendTransaction } from "@/wallet/useVantaSafeSendTransaction";
import { signWalletMessageIntentWithSafety } from "@/wallet/walletMessageIntentSafety.mjs";

type ShieldRegistry = ReturnType<typeof useVantaShieldAssetRegistryState>;
type ViewingKey = ReturnType<typeof useVantaShieldViewingKey>;
type SolanaClient = ReturnType<typeof useSolanaClient>;
type WalletSession = ReturnType<typeof useWalletSession>;

type UseUnshieldExecutionArgs = {
  client: SolanaClient;
  requestedAmountNumeric: number | null;
  selectedLane: UnshieldLane;
  selectedShieldAccount: NonNullable<ShieldRegistry["byAssetKey"]["USDC"]["account"]> | null;
  selectedShieldAsset: ReturnType<typeof getLiveShieldTokenAsset> | null;
  selectedShieldNote: { amount: number; noteId: string; stateSignature: string } | null;
  selectedSolNote: import("@/solana/vantaShieldState").VantaShieldedSolNote | null;
  shieldRegistry: ShieldRegistry;
  solShieldAccount: ShieldRegistry["byAssetKey"]["USDC"]["account"];
  usdcShieldEntry: ShieldRegistry["byAssetKey"]["USDC"];
  viewingKey: ViewingKey;
  walletAddress: string | null | undefined;
  walletSession: WalletSession | null | undefined;
};

export function useUnshieldExecution({
  client,
  requestedAmountNumeric,
  selectedLane,
  selectedShieldAccount,
  selectedShieldAsset,
  selectedShieldNote,
  selectedSolNote,
  shieldRegistry,
  solShieldAccount,
  usdcShieldEntry,
  viewingKey,
  walletAddress,
  walletSession,
}: UseUnshieldExecutionArgs) {
  const [status, setStatus] = useState<UnshieldStatus>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [pendingSpentMarker, setPendingSpentMarker] = useState<PendingSpentMarker | null>(null);
  const [pendingTransitionApproval, setPendingTransitionApproval] =
    useState<PreparedWalletApproval | null>(null);
  const [pendingFinalizationApproval, setPendingFinalizationApproval] =
    useState<PreparedWalletApproval | null>(null);
  const [pendingSplitMarker, setPendingSplitMarker] = useState<PendingSplitMarker | null>(null);
  const [pendingSplitFinalizationApproval, setPendingSplitFinalizationApproval] =
    useState<PreparedWalletApproval | null>(null);
  const [pendingSplitFollowup, setPendingSplitFollowup] = useState<PendingSplitFollowup | null>(null);
  const [pendingUnshieldBridge, setPendingUnshieldBridge] = useState<PendingUnshieldBridge | null>(null);
  const [pendingUmbraApprovalDisplay, setPendingUmbraApprovalDisplay] =
    useState<UmbraOperationApprovalDisplay | null>(null);
  const [releaseHandoffRefreshPending, setReleaseHandoffRefreshPending] = useState(false);
  const [unshieldBridgeError, setUnshieldBridgeError] = useState<string | null>(null);
  const [operatorAuthorizationStarted, setOperatorAuthorizationStarted] = useState(false);
  const [operatorReleaseSignature, setOperatorReleaseSignature] = useState<string | null>(null);
  const [lastTransitionSignature, setLastTransitionSignature] = useState<string | null>(null);
  const [lastSpentMarkerSignature, setLastSpentMarkerSignature] = useState<string | null>(null);
  const [lastCompletion, setLastCompletion] = useState<UnshieldCompletion | null>(null);

  const resetFlowStatus = useCallback(() => {
    setStatus("idle");
    setFlowError(null);
  }, []);

  const operatorAuthorizationLockRef = useRef<string | null>(null);
  const splitFollowupLaunchRef = useRef<string | null>(null);
  const transitionTransaction = useVantaSafeSendTransaction();
  const transitionWait = useRealtimeSignatureProgress(
    transitionTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !transitionTransaction.signature,
    },
  );
  const spentMarkerTransaction = useVantaSafeSendTransaction();
  const spentMarkerWait = useRealtimeSignatureProgress(
    spentMarkerTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !spentMarkerTransaction.signature,
    },
  );
  const splitTransitionTransaction = useVantaSafeSendTransaction();
  const splitTransitionWait = useRealtimeSignatureProgress(
    splitTransitionTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !splitTransitionTransaction.signature,
    },
  );
  const splitSpentMarkerTransaction = useVantaSafeSendTransaction();
  const splitSpentMarkerWait = useRealtimeSignatureProgress(
    splitSpentMarkerTransaction.signature ?? undefined,
    {
      commitment: "confirmed",
      disabled: !splitSpentMarkerTransaction.signature,
    },
  );

  const transitionProgressLabel = transitionWait.detailLabel;
  const finalizationProgressLabel = spentMarkerWait.detailLabel;
  const unshieldZkDiagnostics = listCanonicalUnshieldDiagnosticsSummaries().slice(0, 5);
  const currentUnshieldZkDiagnostics =
    (lastTransitionSignature
      ? unshieldZkDiagnostics.find((record) => record.transitionSignature === lastTransitionSignature)
      : null) ??
    unshieldZkDiagnostics[0] ??
    null;
  const showPrivateReleaseCard = false;

  useEffect(() => {
    if (transitionTransaction.status === "loading") {
      if (pendingTransitionApproval) {
        setStatus("recording_transition");
      }
      return;
    }

    if (transitionTransaction.status === "error") {
      setStatus("failed");
    setFlowError(
      transitionTransaction.error instanceof Error
        ? transitionTransaction.error.message
        : "The unshield transition could not be submitted.",
    );
      setOperatorAuthorizationStarted(false);
      operatorAuthorizationLockRef.current = null;
      setPendingSpentMarker(null);
      setPendingUnshieldBridge(null);
    }
  }, [pendingTransitionApproval, transitionTransaction.error, transitionTransaction.status]);

  useEffect(() => {
    if (transitionWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      transitionWait.waitError instanceof Error
        ? transitionWait.waitError.message
        : "The unshield transition was submitted but not confirmed.",
    );
    setOperatorAuthorizationStarted(false);
    operatorAuthorizationLockRef.current = null;
    setPendingSpentMarker(null);
    setPendingUnshieldBridge(null);
  }, [transitionWait.waitError, transitionWait.waitStatus]);

  useEffect(() => {
    if (splitTransitionTransaction.status === "loading") {
      setStatus("splitting_note");
      return;
    }

    if (splitTransitionTransaction.status === "error") {
      setStatus("failed");
      setFlowError(
        splitTransitionTransaction.error instanceof Error
          ? splitTransitionTransaction.error.message
          : "The hidden split transition could not be submitted.",
      );
      setPendingSplitMarker(null);
      setPendingSplitFollowup(null);
      splitFollowupLaunchRef.current = null;
    }
  }, [splitTransitionTransaction.error, splitTransitionTransaction.status]);

  useEffect(() => {
    if (splitTransitionWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      splitTransitionWait.waitError instanceof Error
        ? splitTransitionWait.waitError.message
        : "The hidden split transition was submitted but not confirmed.",
    );
    setPendingSplitMarker(null);
    setPendingSplitFollowup(null);
    splitFollowupLaunchRef.current = null;
  }, [splitTransitionWait.waitError, splitTransitionWait.waitStatus]);

  useEffect(() => {
    if (
      splitTransitionWait.waitStatus !== "success" ||
      !pendingSplitMarker ||
      splitSpentMarkerTransaction.status === "loading" ||
      splitSpentMarkerTransaction.signature
    ) {
      return;
    }

    setStatus("finalizing_split");
    void buildHeliusPriorityFeeInstructions({
      accountKeys: [
        pendingSplitMarker.consumedNoteId,
        pendingSplitMarker.mintAddress,
        pendingSplitMarker.owner,
        pendingSplitMarker.transitionNoteId,
        pendingSplitMarker.vaultOwner,
        pendingSplitMarker.recipientValue,
      ],
      action: "state_finalize",
    })
      .then((priorityFeeInstructions) => {
        const instructions = [
          ...priorityFeeInstructions,
          createSpentMarkerInstruction({
            asset: "USDC",
            consumedNoteId: pendingSplitMarker.consumedNoteId,
            createdAt: pendingSplitMarker.createdAt,
            mintAddress: pendingSplitMarker.mintAddress,
            owner: pendingSplitMarker.owner,
            transitionKind: "send",
            transitionNoteId: pendingSplitMarker.transitionNoteId,
            vaultOwner: pendingSplitMarker.vaultOwner,
          }, { viewingPublicKey: viewingKey?.publicKey }),
        ];

        return splitSpentMarkerTransaction.preflight({
          amount: pendingSplitMarker.amount,
          asset: "USDC",
          cluster: vantaSolanaCluster,
          explicitMainnetApproval: vantaExplicitMainnetApproval,
          connectedWalletAddress: pendingSplitMarker.owner,
          estimatedFees: "wallet-estimated",
          feePayer: pendingSplitMarker.owner,
          humanApprovedSummary: true,
          instructions,
          label: "unshield-split-spent-marker",
          recipient: pendingSplitMarker.vaultOwner,
          summaryInstructions: ["unshield-split-spent-marker"],
          transactionFingerprint: `unshield-split-spent-marker:${pendingSplitMarker.owner}:${pendingSplitMarker.consumedNoteId}:${pendingSplitMarker.transitionNoteId}`,
        });
      })
      .then((splitFinalizationApproval) => {
        if (splitFinalizationApproval.status === "blocked") {
          throw new Error(
            `The hidden split spent marker is blocked before wallet approval: ${splitFinalizationApproval.reason}.`,
          );
        }

        setPendingSplitFinalizationApproval(splitFinalizationApproval);
        setStatus("split_finalization_ready");
      })
      .catch((error) => {
        setStatus("failed");
        setFlowError(
          error instanceof Error
            ? error.message
            : "The hidden split spent marker could not be submitted.",
        );
        setPendingSplitMarker(null);
        setPendingSplitFinalizationApproval(null);
        setPendingSplitFollowup(null);
        splitFollowupLaunchRef.current = null;
      });
  }, [
    pendingSplitMarker,
    splitSpentMarkerTransaction,
    splitSpentMarkerTransaction.signature,
    splitSpentMarkerTransaction.status,
    splitTransitionWait.waitStatus,
    viewingKey?.publicKey,
  ]);

  useEffect(() => {
    if (splitSpentMarkerTransaction.status !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      splitSpentMarkerTransaction.error instanceof Error
        ? splitSpentMarkerTransaction.error.message
        : "The hidden split spent marker could not be submitted.",
    );
    setPendingSplitMarker(null);
    setPendingSplitFinalizationApproval(null);
    setPendingSplitFollowup(null);
    splitFollowupLaunchRef.current = null;
  }, [splitSpentMarkerTransaction.error, splitSpentMarkerTransaction.status]);

  const finalizePendingSplitState = useCallback(async () => {
    if (
      !pendingSplitFinalizationApproval ||
      splitSpentMarkerTransaction.status === "loading" ||
      splitSpentMarkerTransaction.signature
    ) {
      return;
    }

    setStatus("finalizing_split");

    try {
      await splitSpentMarkerTransaction.sendPrepared(pendingSplitFinalizationApproval);
      setPendingSplitFinalizationApproval(null);
    } catch (error) {
      setStatus("failed");
      setFlowError(
        error instanceof Error
          ? error.message
          : "The hidden split spent marker could not be approved in the wallet.",
      );
      setPendingSplitMarker(null);
      setPendingSplitFinalizationApproval(null);
      setPendingSplitFollowup(null);
      splitFollowupLaunchRef.current = null;
    }
  }, [
    pendingSplitFinalizationApproval,
    splitSpentMarkerTransaction,
    splitSpentMarkerTransaction.signature,
    splitSpentMarkerTransaction.status,
  ]);

  useEffect(() => {
    if (splitSpentMarkerWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      splitSpentMarkerWait.waitError instanceof Error
        ? splitSpentMarkerWait.waitError.message
        : "The hidden split spent marker was submitted but not confirmed.",
    );
    setPendingSplitMarker(null);
    setPendingSplitFinalizationApproval(null);
    setPendingSplitFollowup(null);
    splitFollowupLaunchRef.current = null;
  }, [splitSpentMarkerWait.waitError, splitSpentMarkerWait.waitStatus]);

  useEffect(() => {
    if (
      splitSpentMarkerWait.waitStatus !== "success" ||
      !pendingSplitFollowup ||
      splitFollowupLaunchRef.current === pendingSplitFollowup.childNoteId ||
      !selectedShieldAsset?.mintAddress ||
      !selectedShieldAccount
    ) {
      return;
    }

    splitFollowupLaunchRef.current = pendingSplitFollowup.childNoteId;
    setStatus("review");

    const refreshTasks = shieldRegistry.configuredEntries.flatMap((entry) => [
      entry.refresh(),
      entry.token.refresh(),
    ]);

    void Promise.all(refreshTasks)
      .then(async () => {
        const splitMintAddress = selectedShieldAsset.mintAddress;

        if (!splitMintAddress) {
          throw new Error("The USDC shield mint is unavailable for the exact unshield split.");
        }

        const refreshedAccount = await fetchVantaShieldAccountState({
          client,
          mintAddress: splitMintAddress,
          owner: selectedShieldAccount.owner,
          vaultOwner: selectedShieldAccount.vaultOwner,
          viewingSecretKey: viewingKey?.secretKey,
        });
        const exactChildNote = refreshedAccount.spendableShieldNotes.find(
          (note) => note.noteId === pendingSplitFollowup.childNoteId,
        );

        if (!exactChildNote) {
          throw new Error(
            "Vanta split the protected balance, but the exact child amount could not be recovered for return.",
          );
        }

        setPendingSplitMarker(null);
        setPendingSplitFinalizationApproval(null);
        setPendingSplitFollowup(null);
        splitFollowupLaunchRef.current = null;
        await beginTokenUnshieldFromNote({
          note: exactChildNote,
          shieldAccount: refreshedAccount,
          shieldAsset: selectedShieldAsset,
        });
      })
      .catch((error) => {
        setStatus("failed");
        setFlowError(
          error instanceof Error
            ? error.message
            : "The hidden split completed, but Vanta could not recover the exact child note.",
        );
        setPendingSplitMarker(null);
        setPendingSplitFinalizationApproval(null);
        setPendingSplitFollowup(null);
        splitFollowupLaunchRef.current = null;
      });
  }, [
    beginTokenUnshieldFromNote,
    client,
    pendingSplitFollowup,
    selectedShieldAccount,
    selectedShieldAsset,
    shieldRegistry.configuredEntries,
    splitSpentMarkerWait.waitStatus,
    viewingKey?.secretKey,
  ]);

  const operatorReleaseDisabledReason = useMemo(() => {
    if (!pendingSpentMarker) {
      return "Prepare an Unshield note first.";
    }

    if (!walletAddress) {
      return "Connect the shield owner wallet.";
    }

    if (walletAddress !== pendingSpentMarker.owner) {
      return "Connect the wallet that owns this note.";
    }

    if (operatorAuthorizationStarted) {
      return "Release already in progress.";
    }

    if (operatorAuthorizationLockRef.current === pendingSpentMarker.transitionNoteId) {
      return "Release already requested for this note.";
    }

    if (
      pendingSpentMarker.asset !== "SOL" &&
      !getLiveShieldTokenAsset(pendingSpentMarker.asset).unshieldOperatorUrl
    ) {
      return `${pendingSpentMarker.asset} release endpoint isn't configured.`;
    }

    if (pendingSpentMarker.asset === "SOL" && !liveSwapPair.solUnshieldOperatorUrl) {
      return "SOL release endpoint isn't configured.";
    }

    return null;
  }, [
    liveSwapPair.solUnshieldOperatorUrl,
    operatorAuthorizationStarted,
    pendingSpentMarker,
    walletAddress,
  ]);

  const authorizePendingOperatorRelease = useCallback(async () => {
    if (operatorReleaseDisabledReason || !pendingSpentMarker || !walletAddress) {
      setFlowError(operatorReleaseDisabledReason ?? "Prepare an Unshield note first.");
      return;
    }

    operatorAuthorizationLockRef.current = pendingSpentMarker.transitionNoteId;
    setOperatorAuthorizationStarted(true);
    setStatus("authorizing_operator");

    try {
      const releaseResult =
        pendingSpentMarker.asset !== "SOL"
          ? await (async () => {
              const signMessage = walletSession?.signMessage;

              if (!signMessage) {
                throw new Error("The connected wallet must support message signing.");
              }

              const tokenAsset = pendingSpentMarker.asset as LiveShieldTokenAssetKey;
              const shieldAsset = getLiveShieldTokenAsset(tokenAsset);
              const payload = createUnshieldIntentPayload({
                amount: pendingSpentMarker.amount,
                destinationOwner: pendingSpentMarker.owner,
                mintAddress: shieldAsset.mintAddress ?? "",
                noteId: pendingSpentMarker.consumedNoteId,
                owner: pendingSpentMarker.owner,
                requester: pendingSpentMarker.owner,
                transitionNoteId: pendingSpentMarker.transitionNoteId,
                vaultOwner: pendingSpentMarker.vaultOwner,
              });

              const signedIntent = await signUnshieldIntent(payload, async (message) => {
                const messageIntentSignature = await signWalletMessageIntentWithSafety({
                  amount: payload.amount,
                  asset: tokenAsset,
                  connectedWalletAddress: walletAddress,
                  expiresAt: payload.issuedAt + VANTA_UNSHIELD_INTENT_TTL_MS,
                  humanApprovedSummary: true,
                  intentKind: "unshield-intent",
                  issuedAt: payload.issuedAt,
                  message,
                  owner: payload.owner,
                  recipient: payload.destinationOwner,
                  requestId: payload.requestId,
                  requester: payload.requester,
                  signMessage,
                });

                if (
                  !messageIntentSignature.signed ||
                  !messageIntentSignature.signatureBytes ||
                  messageIntentSignature.decision.reason !== "message-intent-ready-for-wallet-approval"
                ) {
                  throw new Error(
                    `The token unshield intent could not be signed: ${messageIntentSignature.decision.reason}.`,
                  );
                }

                return messageIntentSignature.signatureBytes;
              });

              return requestOperatorUnshield(signedIntent, shieldAsset.unshieldOperatorUrl);
            })()
          : await (async () => {
              const signMessage = walletSession?.signMessage;

              if (!signMessage) {
                throw new Error("The connected wallet must support message signing.");
              }

              const payload = createSolUnshieldIntentPayload({
                amount: pendingSpentMarker.amount,
                asset: "SOL",
                assetId: liveSwapPair.solAssetId,
                consumedNoteId: pendingSpentMarker.consumedNoteId,
                destinationOwner: pendingSpentMarker.owner,
                owner: pendingSpentMarker.owner,
                requester: pendingSpentMarker.owner,
                transitionNoteId: pendingSpentMarker.transitionNoteId,
                vaultOwner: pendingSpentMarker.vaultOwner,
              });

              const signedIntent = await signSolUnshieldIntent(payload, async (message) => {
                const messageIntentSignature = await signWalletMessageIntentWithSafety({
                  amount: payload.amount,
                  asset: payload.asset,
                  connectedWalletAddress: walletAddress,
                  expiresAt: payload.issuedAt + VANTA_SOL_UNSHIELD_INTENT_TTL_MS,
                  humanApprovedSummary: true,
                  intentKind: "sol-unshield-intent",
                  issuedAt: payload.issuedAt,
                  message,
                  owner: payload.owner,
                  recipient: payload.destinationOwner,
                  requestId: payload.requestId,
                  requester: payload.requester,
                  signMessage,
                });

                if (
                  !messageIntentSignature.signed ||
                  !messageIntentSignature.signatureBytes ||
                  messageIntentSignature.decision.reason !== "message-intent-ready-for-wallet-approval"
                ) {
                  throw new Error(
                    `The SOL unshield intent could not be signed: ${messageIntentSignature.decision.reason}.`,
                  );
                }

                return messageIntentSignature.signatureBytes;
              });

              return requestOperatorSolUnshield(signedIntent);
            })();

      setOperatorReleaseSignature(releaseResult.signature);
      setLastCompletion((current) =>
        current ? { ...current, requestId: releaseResult.requestId } : current,
      );
      setStatus("complete");
      setFlowError(null);
      setUnshieldBridgeError(null);
      setPendingSpentMarker(null);
      setPendingUnshieldBridge(null);
      void Promise.all(shieldRegistry.configuredEntries.flatMap((entry) => [
        entry.refresh(),
        entry.token.refresh(),
      ]));
    } catch (error) {
      setStatus("failed");
      setFlowError(
        error instanceof Error
          ? error.message
          : `The ${pendingSpentMarker.asset} unshield operator could not process the request.`,
      );
      setPendingSpentMarker(null);
      setPendingUnshieldBridge(null);
    } finally {
      setOperatorAuthorizationStarted(false);
      operatorAuthorizationLockRef.current = null;
    }
  }, [
    operatorReleaseDisabledReason,
    liveSwapPair.solAssetId,
    pendingSpentMarker,
    shieldRegistry.configuredEntries,
    walletAddress,
    walletSession?.signMessage,
  ]);

  const approvePreparedUnshieldTransition = useCallback(async () => {
    if (!pendingTransitionApproval || transitionTransaction.status === "loading") {
      return;
    }

    setStatus("recording_transition");

    try {
      await transitionTransaction.sendPrepared(pendingTransitionApproval);
      setPendingTransitionApproval(null);
    } catch (error) {
      setStatus("failed");
      setFlowError(
        error instanceof Error
          ? error.message
          : "The unshield transition could not be approved in the wallet.",
      );
      setPendingTransitionApproval(null);
      setPendingSpentMarker(null);
      setPendingUnshieldBridge(null);
    }
  }, [pendingTransitionApproval, transitionTransaction]);

  const finalizePendingUnshieldState = useCallback(async () => {
    if (
      !pendingFinalizationApproval ||
      spentMarkerTransaction.status === "loading" ||
      spentMarkerTransaction.signature
    ) {
      return;
    }

    setStatus("finalizing_state");

    try {
      await spentMarkerTransaction.sendPrepared(pendingFinalizationApproval);
      setPendingFinalizationApproval(null);
    } catch (error) {
      setStatus("failed");
      setFlowError(
        error instanceof Error
          ? error.message
          : "The spent marker could not be submitted.",
      );
      setOperatorAuthorizationStarted(false);
      operatorAuthorizationLockRef.current = null;
      setPendingUnshieldBridge(null);
    }
  }, [
    pendingFinalizationApproval,
    spentMarkerTransaction,
    spentMarkerTransaction.signature,
    spentMarkerTransaction.status,
  ]);

  useEffect(() => {
    if (
      transitionWait.waitStatus !== "success" ||
      !pendingSpentMarker ||
      operatorAuthorizationStarted ||
      spentMarkerTransaction.status === "loading" ||
      spentMarkerTransaction.signature ||
      status === "operator_ready" ||
      status === "authorizing_operator" ||
      status === "release_ready" ||
      status === "finalizing_state" ||
      status === "complete" ||
      status === "failed"
    ) {
      return;
    }

    setStatus("operator_ready");
  }, [
    operatorAuthorizationStarted,
    pendingSpentMarker,
    spentMarkerTransaction.signature,
    spentMarkerTransaction.status,
    status,
    transitionWait.waitStatus,
  ]);

  useEffect(() => {
    if (spentMarkerTransaction.status !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      spentMarkerTransaction.error instanceof Error
        ? spentMarkerTransaction.error.message
        : "The spent marker could not be submitted.",
    );
    setOperatorAuthorizationStarted(false);
    operatorAuthorizationLockRef.current = null;
    setPendingUnshieldBridge(null);
  }, [spentMarkerTransaction.error, spentMarkerTransaction.status]);

  useEffect(() => {
    if (spentMarkerWait.waitStatus !== "error") {
      return;
    }

    setStatus("failed");
    setFlowError(
      spentMarkerWait.waitError instanceof Error
        ? spentMarkerWait.waitError.message
        : "The spent marker was submitted but not confirmed.",
    );
    setOperatorAuthorizationStarted(false);
    operatorAuthorizationLockRef.current = null;
    setPendingUnshieldBridge(null);
  }, [spentMarkerWait.waitError, spentMarkerWait.waitStatus]);

  useEffect(() => {
    if (spentMarkerWait.waitStatus !== "success") {
      return;
    }

    const refreshTasks = shieldRegistry.configuredEntries.flatMap((entry) => [
      entry.refresh(),
      entry.token.refresh(),
    ]);

    void Promise.all(refreshTasks)
      .then(async () => {
        if (pendingUnshieldBridge && transitionTransaction.signature) {
          try {
            await recordCanonicalUnshieldFromLiveUnshield({
              amountDisplay: pendingUnshieldBridge.amountDisplay,
              asset: pendingUnshieldBridge.asset,
              assetId: pendingUnshieldBridge.assetId,
              createdAt: pendingUnshieldBridge.createdAt,
              destinationOwner: pendingUnshieldBridge.destinationOwner,
              mintAddress: pendingUnshieldBridge.mintAddress,
              owner: pendingUnshieldBridge.owner,
              consumed: pendingUnshieldBridge.consumed,
              operator: {
                releaseSignature: operatorReleaseSignature ?? undefined,
                requestId: lastCompletion?.requestId,
              },
              transition: {
                noteId: pendingUnshieldBridge.transition.noteId,
                signature: transitionTransaction.signature,
                spentMarkerSignature: spentMarkerTransaction.signature ?? undefined,
              },
              vaultOwner: pendingUnshieldBridge.vaultOwner,
            });
            setUnshieldBridgeError(null);
          } catch (error) {
            setUnshieldBridgeError(
              error instanceof Error
                ? error.message
                : "Unshield done, but exit diagnostics didn't save.",
            );
          }
        } else {
          setUnshieldBridgeError(
            "Unshield done, but exit bridge context wasn't available.",
          );
        }

        setStatus("complete");
        setFlowError(null);
        setOperatorAuthorizationStarted(false);
        operatorAuthorizationLockRef.current = null;
        setPendingSpentMarker(null);
        setPendingUnshieldBridge(null);
      })
      .catch((error) => {
        setStatus("failed");
        setFlowError(
          error instanceof Error
            ? error.message
            : "Unshield done, but wallet or Vanta state didn't refresh.",
        );
        setOperatorAuthorizationStarted(false);
        operatorAuthorizationLockRef.current = null;
        setPendingUnshieldBridge(null);
      });
  }, [
    lastCompletion?.requestId,
    operatorReleaseSignature,
    pendingUnshieldBridge,
    shieldRegistry.configuredEntries,
    spentMarkerTransaction.signature,
    spentMarkerWait.waitStatus,
    transitionTransaction.signature,
  ]);

  useEffect(() => {
    if (transitionTransaction.signature) {
      setLastTransitionSignature(transitionTransaction.signature);
    }
  }, [transitionTransaction.signature]);

  useEffect(() => {
    if (spentMarkerTransaction.signature) {
      setLastSpentMarkerSignature(spentMarkerTransaction.signature);
    }
  }, [spentMarkerTransaction.signature]);

  function resetDirectUnshieldFlow() {
    transitionTransaction.reset();
    spentMarkerTransaction.reset();
    setOperatorReleaseSignature(null);
    setLastTransitionSignature(null);
    setLastSpentMarkerSignature(null);
    setFlowError(null);
    setUnshieldBridgeError(null);
    setOperatorAuthorizationStarted(false);
    operatorAuthorizationLockRef.current = null;
    setPendingTransitionApproval(null);
    setPendingFinalizationApproval(null);
    setPendingSpentMarker(null);
    setPendingSplitFinalizationApproval(null);
    setPendingUnshieldBridge(null);
    setPendingUmbraApprovalDisplay(null);
  }

  async function beginTokenUnshieldFromNote(args: {
    note: NonNullable<typeof selectedShieldNote>;
    shieldAccount: NonNullable<typeof selectedShieldAccount>;
    shieldAsset: NonNullable<typeof selectedShieldAsset>;
  }) {
    assertCanonicalTokenSpendableNote(args.note);

    const mintAddress = args.shieldAsset.mintAddress;

    if (!mintAddress) {
      throw new Error("The selected shield asset is missing its mint address.");
    }

    resetDirectUnshieldFlow();

    const createdAt = Date.now();
    const destinationOwner = walletAddress ?? args.shieldAccount.owner;
    const approvalIssuedAt = Date.now();
    setPendingUmbraApprovalDisplay(
      createUmbraUnshieldActionApprovalReview({
        amountBaseUnits: parseDecimalAmountToBaseUnits(
          formatEditableAmount(args.note.amount, args.shieldAsset.decimals),
          args.shieldAsset.decimals,
        ),
        destinationAddress: destinationOwner,
        expiresAt: approvalIssuedAt + 2 * 60 * 1000,
        issuedAt: approvalIssuedAt,
        mintAddress,
        requester: walletAddress ?? args.shieldAccount.owner,
      }),
    );
    setStatus("awaiting_confirmation");
    const directTransitionNoteId = `direct:${args.note.noteId}`;

    setPendingSpentMarker({
      amount: args.note.amount.toString(),
      amountNumeric: args.note.amount,
      asset: args.shieldAsset.assetKey,
      assetId: mintAddress,
      consumedNoteId: args.note.noteId,
      createdAt,
      owner: args.shieldAccount.owner,
      transitionKind: "unshield",
      transitionNoteId: directTransitionNoteId,
      vaultOwner: args.shieldAccount.vaultOwner,
    });
    setPendingUnshieldBridge({
      amountDisplay: formatEditableAmount(
        args.note.amount,
        args.shieldAsset.decimals,
      ),
      asset: args.shieldAsset.assetKey,
      assetId: mintAddress,
      createdAt,
      destinationOwner,
      mintAddress,
      owner: args.shieldAccount.owner,
      consumed: {
        noteId: args.note.noteId,
        stateSignature: args.note.stateSignature,
      },
      transition: {
        noteId: directTransitionNoteId,
      },
      vaultOwner: args.shieldAccount.vaultOwner,
    });
    setLastCompletion({
      amount: args.note.amount,
      asset: args.shieldAsset.assetKey,
      transitionNoteId: directTransitionNoteId,
    });
    setStatus("operator_ready");
  }

  async function beginSolUnshieldFromNote(args: {
    note: NonNullable<typeof selectedSolNote>;
    shieldAccount: NonNullable<typeof usdcShieldEntry.account>;
  }) {
    assertCanonicalSolSpendableNote(args.note);

    resetDirectUnshieldFlow();

    const createdAt = Date.now();
    const destinationOwner = walletAddress ?? args.shieldAccount.owner;
    const approvalIssuedAt = Date.now();
    setPendingUmbraApprovalDisplay(
      createUmbraUnshieldActionApprovalReview({
        amountBaseUnits: parseDecimalAmountToBaseUnits(formatEditableAmount(args.note.amount, 9), 9),
        destinationAddress: destinationOwner,
        expiresAt: approvalIssuedAt + 2 * 60 * 1000,
        issuedAt: approvalIssuedAt,
        mintAddress: liveSwapPair.solAssetId,
        requester: walletAddress ?? args.shieldAccount.owner,
      }),
    );
    setStatus("awaiting_confirmation");
    const directTransitionNoteId = `direct:${args.note.noteId}`;

    setPendingSpentMarker({
      amount: args.note.amount.toString(),
      amountNumeric: args.note.amount,
      asset: "SOL",
      assetId: liveSwapPair.solAssetId,
      consumedNoteId: args.note.noteId,
      createdAt,
      owner: args.shieldAccount.owner,
      transitionKind: "sol_unshield",
      transitionNoteId: directTransitionNoteId,
      vaultOwner: args.shieldAccount.vaultOwner,
    });
    setPendingUnshieldBridge({
      amountDisplay: formatEditableAmount(args.note.amount, 9),
      asset: "SOL",
      assetId: liveSwapPair.solAssetId,
      createdAt,
      destinationOwner,
      owner: args.shieldAccount.owner,
      consumed: {
        noteId: args.note.noteId,
        stateSignature: args.note.stateSignature,
        sourceSwapNoteId: args.note.sourceSwapNoteId,
      },
      transition: {
        noteId: directTransitionNoteId,
      },
      vaultOwner: args.shieldAccount.vaultOwner,
    });
    setLastCompletion({
      amount: args.note.amount,
      asset: "SOL",
      transitionNoteId: directTransitionNoteId,
    });
    setStatus("operator_ready");
  }

  async function handleUnshield() {
    if (isBetaMode) {
      return;
    }

    const activeShieldAccount = selectedLane === "SOL" ? solShieldAccount : selectedShieldAccount;

    if (!activeShieldAccount || !usdcShieldEntry.asset.vaultOwner) {
      return;
    }

    splitTransitionTransaction.reset();
    splitSpentMarkerTransaction.reset();
    setPendingSplitMarker(null);
    setPendingSplitFinalizationApproval(null);
    setPendingSplitFollowup(null);
    splitFollowupLaunchRef.current = null;

    try {
      if (selectedLane !== "SOL") {
        if (!selectedShieldNote || !selectedShieldAsset?.mintAddress) {
          return;
        }

        assertCanonicalTokenSpendableNote(selectedShieldNote);

        if (
          selectedLane === "USDC" &&
          requestedAmountNumeric !== null &&
          requestedAmountNumeric > 0 &&
          requestedAmountNumeric < selectedShieldNote.amount &&
          !amountsRoughlyMatch(requestedAmountNumeric, selectedShieldNote.amount)
        ) {
          splitTransitionTransaction.reset();
          splitSpentMarkerTransaction.reset();
          setPendingSplitFinalizationApproval(null);
          setPendingSplitFollowup(null);
          splitFollowupLaunchRef.current = null;
          setFlowError(null);
          setUnshieldBridgeError(null);

          const createdAt = Date.now();
          const approvalIssuedAt = Date.now();
          setPendingUmbraApprovalDisplay(
            createUmbraUnshieldActionApprovalReview({
              amountBaseUnits: parseDecimalAmountToBaseUnits(
                formatEditableAmount(requestedAmountNumeric, selectedShieldAsset.decimals),
                selectedShieldAsset.decimals,
              ),
              destinationAddress: walletAddress ?? activeShieldAccount.owner,
              expiresAt: approvalIssuedAt + 2 * 60 * 1000,
              issuedAt: approvalIssuedAt,
              mintAddress: selectedShieldAsset.mintAddress,
              requester: walletAddress ?? activeShieldAccount.owner,
            }),
          );
          setStatus("awaiting_confirmation");
          const nextChangeAmount = Number(
            Math.max(selectedShieldNote.amount - requestedAmountNumeric, 0).toFixed(6),
          );
          if (!viewingKey?.publicKey) {
            throw new Error("Vanta action memo encryption requires your Shield viewing key to be ready.");
          }
          const preparedSplit = createPreparedSendMemo(
            {
              amount: requestedAmountNumeric.toString(),
              asset: "USDC",
              changeAmount: nextChangeAmount.toString(),
              consumedNoteId: selectedShieldNote.noteId,
              createdAt,
              mintAddress: selectedShieldAsset.mintAddress,
              owner: activeShieldAccount.owner,
              recipient: activeShieldAccount.owner,
              vaultOwner: activeShieldAccount.vaultOwner,
            },
            { viewingPublicKey: viewingKey?.publicKey },
          );

          if (!preparedSplit.recipientNoteId) {
            throw new Error("Vanta could not derive the exact split note for this unshield request.");
          }

          setPendingSplitMarker({
            amount: requestedAmountNumeric.toString(),
            amountNumeric: requestedAmountNumeric,
            consumedNoteId: selectedShieldNote.noteId,
            createdAt,
            mintAddress: selectedShieldAsset.mintAddress,
            owner: activeShieldAccount.owner,
            recipientNoteId: preparedSplit.recipientNoteId,
            recipientValue: activeShieldAccount.owner,
            transitionNoteId: preparedSplit.noteId,
            vaultOwner: activeShieldAccount.vaultOwner,
          });
          setPendingSplitFollowup({
            amountNumeric: requestedAmountNumeric,
            childNoteId: preparedSplit.recipientNoteId,
          });
          const priorityFeeInstructions = await buildHeliusPriorityFeeInstructions({
            accountKeys: [
              selectedShieldNote.noteId,
              selectedShieldAsset.mintAddress,
              activeShieldAccount.owner,
              preparedSplit.noteId,
              activeShieldAccount.vaultOwner,
              activeShieldAccount.owner,
            ],
            action: "send_transition",
          });

          const instructions = [...priorityFeeInstructions, preparedSplit.instruction];

          await splitTransitionTransaction.send({
            amount: requestedAmountNumeric.toString(),
            asset: "USDC",
            cluster: vantaSolanaCluster,
      explicitMainnetApproval: vantaExplicitMainnetApproval,
            connectedWalletAddress: activeShieldAccount.owner,
            estimatedFees: "wallet-estimated",
            feePayer: activeShieldAccount.owner,
            humanApprovedSummary: true,
            instructions,
            label: "unshield-split-transition",
            recipient: activeShieldAccount.owner,
            summaryInstructions: ["unshield-split-transition"],
            transactionFingerprint: `unshield-split-transition:${activeShieldAccount.owner}:${selectedShieldNote.noteId}:${preparedSplit.noteId}`,
          });
          return;
        }

        await beginTokenUnshieldFromNote({
          note: selectedShieldNote,
          shieldAccount: activeShieldAccount,
          shieldAsset: selectedShieldAsset,
        });
        return;
      }

      if (!selectedSolNote) {
        return;
      }
      assertCanonicalSolSpendableNote(selectedSolNote);
      await beginSolUnshieldFromNote({
        note: selectedSolNote,
        shieldAccount: activeShieldAccount,
      });
    } catch (error) {
      setPendingSplitMarker(null);
      setPendingSplitFinalizationApproval(null);
      setPendingSplitFollowup(null);
      setPendingSpentMarker(null);
      setPendingUnshieldBridge(null);
      setPendingUmbraApprovalDisplay(null);
      setStatus("failed");
      setFlowError(
        error instanceof Error ? error.message : "Unshield request was not approved.",
      );
    }
  }
  return {
    approvePreparedUnshieldTransition,
    authorizePendingOperatorRelease,
    currentUnshieldZkDiagnostics,
    finalizationProgressLabel,
    finalizePendingSplitState,
    finalizePendingUnshieldState,
    flowError,
    handleUnshield,
    lastCompletion,
    lastSpentMarkerSignature,
    lastTransitionSignature,
    operatorReleaseDisabledReason,
    operatorReleaseSignature,
    pendingFinalizationApproval,
    pendingSplitFinalizationApproval,
    pendingTransitionApproval,
    pendingUmbraApprovalDisplay,
    releaseHandoffRefreshPending,
    resetFlowStatus,
    setReleaseHandoffRefreshPending,
    showPrivateReleaseCard,
    spentMarkerTransaction,
    splitSpentMarkerTransaction,
    status,
    transitionProgressLabel,
    transitionTransaction,
    unshieldBridgeError,
  };
}
