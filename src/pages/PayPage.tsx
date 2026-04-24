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
  const [selectedWorkflow, setSelectedWorkflow] = useState<
    "link" | "invoice" | "checkout"
  >("link");

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
  const checkoutPath = title.trim()
    ? `vanta.test/pay/${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
    : "vanta.test/pay/new-request";
  const selectedWorkflowCopy = {
    link: {
      label: "Payment links",
      title: "Share a hosted checkout path",
      detail: `Use ${checkoutPath} as the test link for this request.`,
    },
    invoice: {
      label: "Invoices",
      title: "Prepare a tracked customer invoice",
      detail: "Keep customer, amount, asset, and receipt preview together before any live processing.",
    },
    checkout: {
      label: "Checkout preview",
      title: "Preview checkout placement",
      detail: "Compare Hosted checkout, Embedded checkout, and Modal checkout without changing beta mode.",
    },
  }[selectedWorkflow];

  return (
    <section className="pay-page pay-page--minimal" aria-labelledby="pay-title">
      <div className="pay-shell pay-shell--minimal">
        <header className="pay-topbar pay-topbar--minimal pay-page__hero product-intro">
          <div>
            <span className="pay-kicker product-intro__eyebrow">Vanta Pay Suite</span>
            <h1 id="pay-title">Create a payment request</h1>
            <p>
              Merchant command center for creating payment requests, previewing checkout paths, and
              keeping suite workflows understandable while Vanta Pay remains a beta preview.
            </p>
            <div className="pay-hero-badges" aria-label="Pay beta status">
              <span>Vanta Beta</span>
              <span>No funds move in this mode</span>
              <span>Production privacy claims are not enabled yet.</span>
            </div>
          </div>
        </header>

        <main className="pay-minimal-stage">
          <article className="pay-payment-card pay-payment-card--cockpit">
            <div className="pay-request-grid">
              <section className="pay-request-builder" aria-labelledby="pay-details-title">
                <header>
                  <span className="pay-kicker">Payment details</span>
                  <h2 id="pay-details-title">Pay with Vanta</h2>
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
              </section>

              <aside className="pay-review-card pay-review-card--live" aria-label="Review payment">
                <span className="pay-kicker">Review payment</span>
                <strong>{paymentLabel}</strong>
                <div>
                  <span>{amountLabel}</span>
                  <span>{customerLabel}</span>
                </div>
                <dl className="pay-request-meta">
                  <div>
                    <dt>Checkout path</dt>
                    <dd>{checkoutPath}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>Preview only</dd>
                  </div>
                  <div>
                    <dt>Receipt</dt>
                    <dd>Receipt path preview</dd>
                  </div>
                </dl>
              </aside>
            </div>

            <section className="pay-path-card" aria-label="Payment path preview">
              <div className="pay-section-mini-header">
                <span className="pay-kicker">Payment path</span>
                <strong>Preview, approve, execute, and settle stay separate.</strong>
              </div>
              <div className="pay-path-steps">
                <span>Preview</span>
                <span>Approve</span>
                <span>Execute</span>
                <span>Settle</span>
              </div>
              <div className="pay-trust-line">
                <span>Payment route preview</span>
                <span>Payment record</span>
                <span>Receipt path preview</span>
                {isBetaMode ? <span>No funds move</span> : null}
              </div>
            </section>

            <section className="pay-suite-workspace" aria-label="Payment suite workflows">
              <div className="pay-section-mini-header">
                <span className="pay-kicker">Payment suite</span>
                <strong>Choose one next step.</strong>
              </div>

              <div className="pay-primary-actions" aria-label="Primary payment actions">
                <button
                  aria-pressed={selectedWorkflow === "link"}
                  className="pay-workflow-action"
                  onClick={() => setSelectedWorkflow("link")}
                  type="button"
                >
                  <span>Link</span>
                </button>
                <button
                  aria-pressed={selectedWorkflow === "invoice"}
                  className="pay-workflow-action"
                  onClick={() => setSelectedWorkflow("invoice")}
                  type="button"
                >
                  <span>Invoice</span>
                </button>
                <button
                  aria-pressed={selectedWorkflow === "checkout"}
                  className="pay-workflow-action"
                  onClick={() => setSelectedWorkflow("checkout")}
                  type="button"
                >
                  <span>Checkout</span>
                </button>
              </div>

              <section className="pay-workflow-detail" aria-live="polite">
                <span>{selectedWorkflowCopy.label}</span>
                <strong>{selectedWorkflowCopy.title}</strong>
                <small>{selectedWorkflowCopy.detail}</small>
              </section>

              <div className="pay-suite-plain-rows" aria-label="More payment suite context">
                <p>
                  <span>After payment</span>
                  Refunds, Withdrawals, Reconciliation, and Subscriptions stay available as
                  follow-up workflows.
                </p>
                <p>
                  <span>Developer controls</span>
                  Embeddable suite preview, API keys, and Signed webhooks are preview-scoped.
                </p>
                <p>
                  <span>Trust rail</span>
                  {VANTA_PAY_MERCHANT_COMMAND_CENTER.betaNotice} Privacy readiness remains blocked:
                  Production privacy claims are not enabled yet.
                </p>
                <p>
                  <span>Operations</span>
                  Operator status, Settlement queue, and Reconciliation are read-only beta context.
                </p>
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
