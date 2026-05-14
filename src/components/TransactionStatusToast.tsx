import { useEffect, useState, type ReactNode } from "react";

export type TransactionStatusTone = "pending" | "processing" | "success" | "warning" | "error";
export type TransactionStatusPhase =
  | "pending"
  | "submitted"
  | "confirmed"
  | "complete"
  | "failed"
  | "action-required";

export type TransactionStatusDetail = {
  id?: string;
  label: ReactNode;
  tone?: "default" | "warning" | "error";
  value: ReactNode;
};

type TransactionStatusToastProps = {
  ariaLabel?: string;
  autoDismissMs?: number;
  children?: ReactNode;
  className?: string;
  details?: readonly TransactionStatusDetail[];
  dismissLabel?: string;
  floating?: boolean;
  message: ReactNode;
  onDismiss?: () => void;
  phase: TransactionStatusPhase;
  progress?: boolean;
  title: ReactNode;
  tone: TransactionStatusTone;
};

export function TransactionStatusToast({
  ariaLabel = "Transaction status",
  autoDismissMs,
  children,
  className,
  details,
  dismissLabel = "Dismiss transaction status",
  floating = false,
  message,
  onDismiss,
  phase,
  progress = false,
  title,
  tone,
}: TransactionStatusToastProps) {
  const [dismissed, setDismissed] = useState(false);
  const alertLike = tone === "error" || tone === "warning";
  const isBusy = progress || phase === "pending" || phase === "submitted";
  const transactionStatusTone = tone;
  const rootClassName = [
    "transaction-status-toast",
    `transaction-status-toast--${transactionStatusTone}`,
    floating ? "transaction-status-toast--floating" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    setDismissed(false);
  }, [phase, title, tone]);

  useEffect(() => {
    if (!autoDismissMs) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setDismissed(true);
      onDismiss?.();
    }, autoDismissMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [autoDismissMs, onDismiss, phase, title, tone]);

  if (dismissed) {
    return null;
  }

  return (
    <aside
      className={rootClassName}
      aria-label={ariaLabel}
      aria-atomic="true"
      aria-busy={isBusy}
      aria-live={alertLike ? "assertive" : "polite"}
      data-transaction-status={phase}
      role={alertLike ? "alert" : "status"}
    >
      <div className="transaction-status-toast__header">
        <div>
          <span>Transaction status</span>
          <strong>{title}</strong>
        </div>
        {onDismiss && (
          <button
            className="transaction-status-toast__dismiss"
            type="button"
            onClick={() => {
              setDismissed(true);
              onDismiss();
            }}
            aria-label={dismissLabel}
          >
            ×
          </button>
        )}
      </div>

      <p className="transaction-status-toast__message">{message}</p>

      {details?.length ? (
        <div className="transaction-status-toast__details">
          {details.map((detail, index) => (
            <div
              className={`transaction-status-toast__detail transaction-status-toast__detail--${detail.tone ?? "default"}`}
              key={detail.id ?? index}
            >
              <span>{detail.label}</span>
              <strong>{detail.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {children && <div className="transaction-status-toast__body">{children}</div>}

      {progress && (
        <div className="transaction-status-toast__progress" aria-hidden="true">
          <div className="transaction-status-toast__progress-fill" />
        </div>
      )}
    </aside>
  );
}
