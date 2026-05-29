import type { ComponentProps } from "react";
import { VantaPrivateCoreStatePanel } from "@/components/VantaPrivateCoreStatePanel";

type StatePanelProps = ComponentProps<typeof VantaPrivateCoreStatePanel>;

export type SendOperatorStatePanelProps = {
  statePanelProps: StatePanelProps;
};

export function SendOperatorStatePanel({ statePanelProps }: SendOperatorStatePanelProps) {
  return <VantaPrivateCoreStatePanel {...statePanelProps} />;
}
