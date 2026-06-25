import type { ReactNode } from "react";

type SafetyCalloutProps = {
  actionLabel?: string;
  children: ReactNode;
  onAction?: () => void;
};

export function SafetyCallout({ actionLabel, children, onAction }: SafetyCalloutProps) {
  return (
    <div className="safety-callout" role="note">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="15" r="4" />
        <path d="m10.85 12.15 6.4-6.4" />
        <path d="M16 5l3 3" />
        <path d="M13 8l3 3" />
      </svg>
      <p className="safety-callout__body">
        {children}
        {actionLabel && onAction ? (
          <button className="safety-callout__action" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </p>
    </div>
  );
}
