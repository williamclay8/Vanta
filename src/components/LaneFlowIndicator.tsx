import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";

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
  const [advanceIndex, setAdvanceIndex] = useState<number | null>(null);
  const rootClassName = ["lane-flow-indicator", className].filter(Boolean).join(" ");
  const stepCountStyle = {
    "--lane-flow-step-count": String(Math.max(steps.length, 1)),
  } as CSSProperties;

  useEffect(() => {
    if (activeStepIndex === undefined) {
      return undefined;
    }

    setAdvanceIndex(activeStepIndex);
    const timeout = window.setTimeout(() => {
      setAdvanceIndex(null);
    }, 520);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeStepIndex]);

  return (
    <div className={rootClassName} aria-label={ariaLabel} style={stepCountStyle}>
      {steps.map((step, index) => {
        const isActive = step.active ?? index === activeStepIndex;

        return (
          <div
            key={step.id}
            className={[
              isActive ? "lane-flow-step lane-flow-step--active" : "lane-flow-step",
              isActive && advanceIndex === index ? "lane-flow-step--advance" : undefined,
            ]
              .filter(Boolean)
              .join(" ")}
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
