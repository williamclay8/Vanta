import { useMemo, useState } from "react";
import { isBetaMode } from "@/config/deploymentMode";
import { VANTA_PAY_ASSET_SYMBOLS, type VantaPayAsset } from "@/pay/vantaPayAssets";
import { VANTA_PAY_MERCHANT_COMMAND_CENTER } from "@/pay/vantaPayMerchantCommandCenter";

type CheckoutMode = "hosted" | "embedded" | "modal";
type PreviewRequest = {
  amount: string;
  asset: VantaPayAsset;
  checkoutPath: string;
  createdAt: string;
  customer: string;
  receiptPath: string;
  sessionId: string;
  title: string;
};

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
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("hosted");
  const [previewRequest, setPreviewRequest] = useState<PreviewRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const paymentLabel = title.trim() || "Untitled payment";
  const amountLabel = useMemo(() => {
    const trimmedAmount = amount.trim();
    return `${trimmedAmount || "0.00"} ${asset}`;
  }, [amount, asset]);
  const customerLabel = customerEmail.trim() || "No customer email";
  const parsedAmount = Number(amount);
  const titleError = !title.trim() ? "Add a short description." : "";
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
  const createdRequest = previewRequest;
  const currentSessionId = createdRequest?.sessionId ?? "Not created yet";
  const currentReceiptPath = createdRequest?.receiptPath ?? "Receipt path preview pending";
  const requestStatus = createdRequest ? "Preview ready" : "Draft";

  function createPreviewRequest() {
    setHasAttemptedSubmit(true);
    setCopied(false);

    if (formHasErrors) {
      return;
    }

    const slug =
      title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "payment";
    const timestamp = Date.now().toString(36);

    setPreviewRequest({
      amount: amount.trim(),
      asset,
      checkoutPath,
      createdAt: new Date().toLocaleString(),
      customer: customerLabel,
      receiptPath: `receipt.preview/${slug}-${timestamp}`,
      sessionId: `cs_test_${slug}_${timestamp}`,
      title: paymentLabel,
    });
  }

  function copyTestLink() {
    if (!createdRequest) {
      createPreviewRequest();
      return;
    }

    void navigator.clipboard?.writeText(createdRequest.checkoutPath);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="pay-page pay-page--transaction" aria-labelledby="pay-title">
      <div className="pay-shell pay-shell--minimal">
        <header className="pay-topbar pay-topbar--minimal pay-page__hero product-intro">
          <div>
            <span className="pay-kicker product-intro__eyebrow">Vanta Pay preview</span>
            <h1 id="pay-title">Create a payment request</h1>
            <p>
              Build a checkout preview, review the transaction, and copy a test link.
            </p>
            <div className="pay-hero-badges" aria-label="Pay beta status">
              <span>{isBetaMode ? "Beta preview" : "Preview mode"}</span>
              <span>No funds move in beta mode</span>
              <span>Production privacy claims are not enabled yet.</span>
            </div>
          </div>
        </header>

        <main className="pay-minimal-stage">
          <article className="pay-payment-card pay-payment-card--cockpit">
            <div className="pay-request-grid">
              <section className="pay-request-builder" aria-labelledby="pay-details-title">
                <header>
                  <span className="pay-kicker">Request builder</span>
                  <h2 id="pay-details-title">Payment details</h2>
                  <p>Create a test checkout session before any live approval or settlement.</p>
                </header>

                <form aria-label="Payment form" className="pay-form pay-form--minimal">
                  <PayField
                    error={visibleTitleError}
                    label="Description"
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
                  <label className="pay-field pay-field--wide">
                    <span>Checkout type</span>
                    <div className="pay-mode-control" role="group" aria-label="Checkout type">
                      {[
                        ["hosted", "Hosted checkout"],
                        ["embedded", "Embedded checkout"],
                        ["modal", "Modal checkout"],
                      ].map(([value, label]) => (
                        <button
                          aria-pressed={checkoutMode === value}
                          key={value}
                          onClick={() => setCheckoutMode(value as CheckoutMode)}
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </label>
                  <PayButton
                    onClick={() => {
                      createPreviewRequest();
                    }}
                  >
                    Create preview request
                  </PayButton>
                  <small className="pay-submit-note">
                    Creates a local preview record only. Private rail receipt required before completion.
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
                    <dt>Test link</dt>
                    <dd>{checkoutPath}</dd>
                  </div>
                  <div>
                    <dt>Checkout type</dt>
                    <dd>{checkoutMode[0].toUpperCase() + checkoutMode.slice(1)} checkout</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{requestStatus}</dd>
                  </div>
                  <div>
                    <dt>Session</dt>
                    <dd>{currentSessionId}</dd>
                  </div>
                  <div>
                    <dt>Receipt path</dt>
                    <dd>{currentReceiptPath}</dd>
                  </div>
                </dl>
              </aside>
            </div>

            <section className="pay-path-card" aria-label="Transaction status">
              <div className="pay-section-mini-header">
                <span className="pay-kicker">Transaction status</span>
                <strong>Approval, execution, and settlement are locked in beta.</strong>
              </div>
              <div className="pay-path-steps">
                <span data-state={createdRequest ? "active" : "idle"}>Preview</span>
                <span data-state="locked">Approve</span>
                <span data-state="locked">Execute</span>
                <span data-state="locked">Settle</span>
              </div>
              <div className="pay-trust-line">
                <span>Local operator preview</span>
                <span>Payment record</span>
                <span>Receipt path preview</span>
                <span>No funds move</span>
              </div>
            </section>

            <section className="pay-next-workspace" aria-label="Next actions">
              <div className="pay-section-mini-header">
                <span className="pay-kicker">Next actions</span>
                <strong>{createdRequest ? "Preview request created." : "Create a request to unlock the test link."}</strong>
              </div>

              <div className="pay-primary-actions" aria-label="Primary payment actions">
                <button
                  className="pay-workflow-action"
                  onClick={copyTestLink}
                  type="button"
                >
                  <span>{copied ? "Copied" : "Copy test link"}</span>
                </button>
                <button
                  className="pay-workflow-action"
                  disabled={!createdRequest}
                  type="button"
                >
                  <span>Preview checkout</span>
                </button>
                <button
                  className="pay-workflow-action"
                  disabled={!createdRequest}
                  type="button"
                >
                  <span>View receipt</span>
                </button>
                <button className="pay-workflow-action" disabled type="button">
                  <span>Prepare refund</span>
                </button>
                <button className="pay-workflow-action" disabled type="button">
                  <span>Prepare withdrawal</span>
                </button>
              </div>

              <section className="pay-record-panel" aria-live="polite">
                <div>
                  <span>Payment records</span>
                  <strong>{createdRequest ? createdRequest.title : "No preview requests yet."}</strong>
                </div>
                {createdRequest ? (
                  <dl className="pay-record-list">
                    <div>
                      <dt>Request</dt>
                      <dd>{createdRequest.sessionId}</dd>
                    </div>
                    <div>
                      <dt>Customer</dt>
                      <dd>{createdRequest.customer}</dd>
                    </div>
                    <div>
                      <dt>Amount</dt>
                      <dd>
                        {createdRequest.amount} {createdRequest.asset}
                      </dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>Preview ready</dd>
                    </div>
                    <div>
                      <dt>Created</dt>
                      <dd>{createdRequest.createdAt}</dd>
                    </div>
                  </dl>
                ) : (
                  <p>No preview checkout created yet.</p>
                )}
              </section>

              <div className="pay-suite-plain-rows" aria-label="More payment records">
                <p>
                  <span>Payment links</span>
                  Create a preview request, then copy its hosted test link.
                </p>
                <p>
                  <span>Invoices</span>
                  Invoice records use the same customer, amount, asset, and receipt path.
                </p>
                <p>
                  <span>Operations</span>
                  Refunds, Withdrawals, Reconciliation, and Subscriptions stay locked until a
                  completed test record exists.
                </p>
                <p>
                  <span>Trust rail</span>
                  {VANTA_PAY_MERCHANT_COMMAND_CENTER.betaNotice} Production privacy claims are not
                  enabled yet.
                </p>
              </div>
            </section>

            <div className="pay-success-card pay-success-card--truth">
              <strong>Vanta Pay is a preview.</strong>
              <span>
                It is not a production payment processor, live mainnet settlement system, or final
                privacy guarantee.
              </span>
            </div>
          </article>
        </main>
      </div>
    </section>
  );
}
