import type { CSSProperties, ReactNode } from "react";

export type LaneFlowStep = {
  active?: boolean;
  id: string;
  label: ReactNode;
};

type LaneFlowIndicatorProps = {
  activeStepIndex?: number;
  ariaLabel: string;
  className?: string;
  steps: readonly LaneFlowStep[];
};

export function LaneFlowIndicator({
  activeStepIndex,
  ariaLabel,
  className,
  steps,
}: LaneFlowIndicatorProps) {
  const rootClassName = ["lane-flow-indicator", className].filter(Boolean).join(" ");
  const stepCountStyle = {
    "--lane-flow-step-count": String(Math.max(steps.length, 1)),
  } as CSSProperties;

  return (
    <div className={rootClassName} aria-label={ariaLabel} style={stepCountStyle}>
      {steps.map((step, index) => {
        const isActive = step.active ?? index === activeStepIndex;

        return (
          <div
            key={step.id}
            className={isActive ? "lane-flow-step lane-flow-step--active" : "lane-flow-step"}
            data-state={isActive ? "active" : "idle"}
            aria-current={isActive ? "step" : undefined}
          >
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
