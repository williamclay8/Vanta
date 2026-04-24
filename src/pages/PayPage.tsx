import { useMemo, useState } from "react";
import { isBetaMode } from "@/config/deploymentMode";
import { VANTA_PAY_ASSET_SYMBOLS, type VantaPayAsset } from "@/pay/vantaPayAssets";
import { VANTA_PAY_MERCHANT_COMMAND_CENTER } from "@/pay/vantaPayMerchantCommandCenter";

function PayButton({
  children,
  disabled = false,
  onClick,
}: {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className="button button-primary"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function PayField({
  error,
  label,
  name,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  error?: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
  placeholder: string;
  type?: string;
  value?: string;
}) {
  return (
    <label className="pay-field">
      <span>{label}</span>
      <input
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${name}-error` : undefined}
        name={name}
        onChange={(event) => {
          onChange?.(event.target.value);
        }}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? (
        <small className="pay-field__error" id={`${name}-error`}>
          {error}
        </small>
      ) : null}
    </label>
  );
}

function PaySelect({
  label,
  name,
  onChange,
  options,
  value,
}: {
  label: string;
  name: string;
  onChange?: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label className="pay-field pay-field--select">
      <span>{label}</span>
      <select
        name={name}
        onChange={(event) => {
          onChange?.(event.target.value);
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function PayPage() {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState<VantaPayAsset>("USDC");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const paymentLabel = title.trim() || "Payment description";
  const amountLabel = useMemo(() => {
    const trimmedAmount = amount.trim();
    return `${trimmedAmount || "0.00"} ${asset}`;
  }, [amount, asset]);
  const customerLabel = customerEmail.trim() || "No customer email yet";
  const parsedAmount = Number(amount);
  const titleError = !title.trim() ? "Add a short payment description." : "";
  const amountError =
    !amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0
      ? "Enter an amount greater than 0."
      : "";
  const emailError =
    customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
      ? "Enter a valid customer email or leave it blank."
      : "";
  const formHasErrors = Boolean(titleError || amountError || emailError);
  const visibleTitleError = hasAttemptedSubmit ? titleError : "";
  const visibleAmountError = hasAttemptedSubmit ? amountError : "";

  return (
    <section className="pay-page pay-page--minimal" aria-labelledby="pay-title">
      <div className="pay-shell pay-shell--minimal">
        <header className="pay-topbar pay-topbar--minimal pay-page__hero product-intro">
          <div>
            <span className="pay-kicker product-intro__eyebrow">Merchant command center</span>
            <h1 id="pay-title">Create a payment request</h1>
            <p>
              Create, preview, and verify a payment path without presenting Vanta Pay as a
              live production processor.
            </p>
          </div>
        </header>

        <main className="pay-minimal-stage">
          <article className="pay-payment-card">
            <header>
              <span className="pay-kicker">Payment details</span>
              <h2>Pay with Vanta</h2>
              <p>Fill in the payment details to preview the merchant request.</p>
            </header>

            <form aria-label="Payment form" className="pay-form pay-form--minimal">
              <PayField
                error={visibleTitleError}
                label="What are you collecting for?"
                name="payment-title"
                onChange={setTitle}
                placeholder="Design retainer"
                value={title}
              />
              <PayField
                error={visibleAmountError}
                label="Amount"
                name="payment-amount"
                onChange={setAmount}
                placeholder="0.00"
                type="number"
                value={amount}
              />
              <PaySelect
                label="Asset"
                name="payment-asset"
                onChange={(value) => setAsset(value as VantaPayAsset)}
                options={VANTA_PAY_ASSET_SYMBOLS}
                value={asset}
              />
              <PayField
                error={emailError}
                label="Customer email"
                name="customer-email"
                onChange={setCustomerEmail}
                placeholder="customer@example.com"
                type="email"
                value={customerEmail}
              />
              <PayButton
                disabled={isBetaMode}
                onClick={() => {
                  setHasAttemptedSubmit(true);
                  if (!formHasErrors && !isBetaMode) {
                    setIsComplete(true);
                  }
                }}
              >
                {isBetaMode ? "Beta mode" : "Pay with Vanta"}
              </PayButton>
              <small className="pay-submit-note">
                {isBetaMode
                  ? "Beta mode keeps this present but disabled. No funds move in this mode."
                  : "Review before submitting."}
              </small>
            </form>

            <section className="pay-review-card" aria-label="Review payment">
              <span className="pay-kicker">Review payment</span>
              <strong>{paymentLabel}</strong>
              <div>
                <span>{amountLabel}</span>
                <span>{customerLabel}</span>
              </div>
            </section>

            <div className="pay-trust-line">
              <span>Payment route preview</span>
              <span>Receipt path preview</span>
              {isBetaMode ? <span>No funds move</span> : null}
            </div>

            <section className="pay-command-center__trust" aria-label="Trust rail">
              <div className="pay-section-mini-header">
                <span className="pay-kicker">Trust rail</span>
                <strong>{VANTA_PAY_MERCHANT_COMMAND_CENTER.betaNotice}</strong>
              </div>
              <div className="pay-command-card-grid">
                {VANTA_PAY_MERCHANT_COMMAND_CENTER.trustRail.map((item) => (
                  <article
                    className={`pay-command-card pay-command-card--${item.tone}`}
                    key={item.label}
                  >
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </article>
                ))}
              </div>
            </section>

            <section className="pay-command-center__operations" aria-label="Operations">
              <div className="pay-section-mini-header">
                <span className="pay-kicker">Operations</span>
                <strong>Read-only beta posture</strong>
              </div>
              <div className="pay-command-card-grid">
                {VANTA_PAY_MERCHANT_COMMAND_CENTER.operations.map((item) => (
                  <article
                    className={`pay-command-card pay-command-card--${item.tone}`}
                    key={item.label}
                  >
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </article>
                ))}
              </div>
            </section>

            {isComplete ? (
              <div className="pay-success-card">
                <strong>Payment submitted</strong>
                <span>
                  {amountLabel} · {paymentLabel} · receipt pending
                </span>
              </div>
            ) : null}
          </article>
        </main>
      </div>
    </section>
  );
}
