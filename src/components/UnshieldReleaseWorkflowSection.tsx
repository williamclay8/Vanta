import { LaneProgressiveSection } from "@/components/LaneProgressiveSection";
import {
  UnshieldReleaseWorkflowPanel,
  type UnshieldReleaseWorkflowPanelProps,
} from "@/components/UnshieldReleaseWorkflowPanel";

export type UnshieldReleaseWorkflowSectionProps = UnshieldReleaseWorkflowPanelProps & {
  visible: boolean;
};

export function UnshieldReleaseWorkflowSection({
  visible,
  ...panelProps
}: UnshieldReleaseWorkflowSectionProps) {
  if (!visible) {
    return null;
  }

  return (
    <LaneProgressiveSection summary="Private release workflow (reviewer)" variant="reviewer">
      <UnshieldReleaseWorkflowPanel {...panelProps} />
    </LaneProgressiveSection>
  );
}
