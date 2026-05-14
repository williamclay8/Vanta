import type { CSSProperties } from "react";

export type QuoteCountdownBarTone = "fresh" | "warning" | "refreshing";

type QuoteCountdownBarProps = {
  className?: string;
  label: string;
  progressPercent: number;
  tone: QuoteCountdownBarTone;
};

export function QuoteCountdownBar({
  className,
  label,
  progressPercent,
  tone,
}: QuoteCountdownBarProps) {
  const boundedProgressPercent = Math.max(0, Math.min(100, Math.round(progressPercent)));
  const visualProgressPercent = tone === "refreshing" ? 100 : boundedProgressPercent;
  const rootClassName = ["quote-countdown-bar", className].filter(Boolean).join(" ");
  const fillStyle = {
    width: `${visualProgressPercent}%`,
  } satisfies CSSProperties;

  return (
    <div
      className={rootClassName}
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={boundedProgressPercent}
      aria-valuetext={label}
      data-quote-countdown-tone={tone}
      data-vanta-quote-countdown-bar
      role="progressbar"
    >
      <span className="quote-countdown-bar__fill" style={fillStyle} />
    </div>
  );
}
