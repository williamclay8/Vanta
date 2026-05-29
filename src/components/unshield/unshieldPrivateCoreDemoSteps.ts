import type { PrivateCoreDemoStep } from "@/components/UnshieldReleaseWorkflowPanel";
import type {
  VantaPrivateCoreHoldState,
  VantaPrivateCoreSendState,
  VantaPrivateCoreShieldState,
  VantaPrivateCoreUnshieldState,
} from "@/data/context/PrivacyFlowContext";

type BuildUnshieldPrivateCoreDemoStepsArgs = {
  privateCoreHoldState: VantaPrivateCoreHoldState | null | undefined;
  privateCoreRecentShield: VantaPrivateCoreShieldState | null | undefined;
  privateCoreSendCompleted: boolean;
  privateCoreSendState: VantaPrivateCoreSendState | null | undefined;
  privateCoreUnshieldState: VantaPrivateCoreUnshieldState | null | undefined;
};

export function buildUnshieldPrivateCoreDemoSteps({
  privateCoreHoldState,
  privateCoreRecentShield,
  privateCoreSendCompleted,
  privateCoreSendState,
  privateCoreUnshieldState,
}: BuildUnshieldPrivateCoreDemoStepsArgs): readonly PrivateCoreDemoStep[] {
  return [
    {
      label: "Shield private value",
      status: privateCoreRecentShield ? "done" : "pending",
      summary: privateCoreRecentShield ? "Private note created" : "Shield first",
    },
    {
      label: "Hold confirmed",
      status: privateCoreHoldState?.privateNoteRecovered ? "done" : "pending",
      summary: privateCoreHoldState?.privateNoteRecovered
        ? "Note recovered with witness"
        : "Awaiting recovered note",
    },
    {
      label: "Send from shielded state",
      status: privateCoreSendCompleted ? "done" : "pending",
      summary: privateCoreSendCompleted
        ? privateCoreSendState?.residualStateStatus ?? "Private send verified and applied"
        : "Awaiting first private send",
    },
    {
      label: "Unshield once",
      status: privateCoreUnshieldState?.consumeSucceeded ? "done" : "pending",
      summary: privateCoreUnshieldState?.consumeSucceeded
        ? "Operator-authorized consume succeeded"
        : privateCoreSendCompleted
          ? "Awaiting first consume"
          : "Available after private send",
    },
    {
      label: "Replay rejected",
      status: privateCoreUnshieldState?.replayRejected ? "done" : "pending",
      summary: privateCoreUnshieldState?.replayRejected
        ? "Nullifier reuse blocked"
        : privateCoreUnshieldState?.consumeSucceeded
          ? "Ready to demonstrate"
          : "Available after first consume",
    },
  ];
}
