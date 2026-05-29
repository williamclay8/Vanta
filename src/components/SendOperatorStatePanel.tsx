import { VantaPrivateCoreStatePanel } from "@/components/VantaPrivateCoreStatePanel";
import type { VantaPrivateCoreStatePanelProps } from "@/components/privateCore/buildPrivateCoreStatePanelProps";

export type SendOperatorStatePanelProps = {
  statePanelProps: VantaPrivateCoreStatePanelProps;
};

export function SendOperatorStatePanel({ statePanelProps }: SendOperatorStatePanelProps) {
  return <VantaPrivateCoreStatePanel {...statePanelProps} />;
}
