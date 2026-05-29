import type { ReactNode } from "react";

type LaneProgressiveSectionProps = {
  children: ReactNode;
  className?: string;
  summary: ReactNode;
  variant?: "reviewer" | "optional" | "history";
};

export function LaneProgressiveSection({
  children,
  className,
  summary,
  variant = "reviewer",
}: LaneProgressiveSectionProps) {
  return (
    <details
      className={[
        "lane-progressive-section",
        `lane-progressive-section--${variant}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <summary>{summary}</summary>
      <div className="lane-progressive-section__body">{children}</div>
    </details>
  );
}
