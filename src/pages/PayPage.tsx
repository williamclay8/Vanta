import type { ReactNode } from "react";
import { useState } from "react";
import { isBetaMode } from "@/config/deploymentMode";
import { VANTA_PAY_PRIVATE_SETTLEMENT_SUMMARY } from "@/pay/vantaPayPrivateSettlementAdapter";

type PayView = "link" | "invoice" | "checkout" | "withdraw";

const payViews = [
  { id: "link", label: "Payment Link" },
  { id: "invoice", label: "Invoice" },
  { id: "checkout", label: "Checkout" },
  { id: "withdraw", label: "Withdraw" },
] satisfies readonly { id: PayView; label: string }[];

function PayButton({
  children,
  disabled = false,
  onClick,
  variant = "secondary",
}: {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      className={variant === "primary" ? "button button-primary" : "button button-ghost"}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function PayField({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange?: (value: string) => void;
  placeholder: string;
  type?: string;
  value?: string;
}) {
  return (
    <label className="pay-field">
      <span>{label}</span>
      <input
        onChange={(event) => {
          onChange?.(event.target.value);
        }}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function PaySelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange?: (value: string) => void;
  options: readonly string[];
  value?: string;
}) {
  return (
    <label className="pay-field pay-field--select">
      <span>{label}</span>
      <select
        onChange={(event) => {
          onChange?.(event.target.value);
        }}
        value={value ?? options[0]}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function PayActionCard({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <article className="pay-action-card">
      <header>
        <span className="pay-kicker">{eyebrow}</span>
        <h2>{title}</h2>
      </header>
      {children}
    </article>
  );
}

function PaymentLinkView() {
  const [linkName, setLinkName] = useState("");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("USDC");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [created, setCreated] = useState(false);

  return (
    <PayActionCard eyebrow="Pay" title="Create payment link">
      <form className="pay-form pay-form--minimal">
        <PayField label="Link name" placeholder="Link name" value={linkName} onChange={setLinkName} />
        <PayField label="Amount" placeholder="0.00" type="number" value={amount} onChange={setAmount} />
        <PaySelect label="Asset" options={["USDC", "SOL", "USDT"]} value={asset} onChange={setAsset} />
        <PayField
          label="Redirect URL"
          placeholder="https://merchant.com/thanks"
          value={redirectUrl}
          onChange={setRedirectUrl}
        />
        <PayButton
          onClick={() => {
            setCreated(true);
          }}
          disabled={isBetaMode}
          variant="primary"
        >
          {isBetaMode ? "Beta mode" : "Create payment link"}
        </PayButton>
      </form>
      {created ? (
        <div className="pay-result-line">
          <span>Payment link ready</span>
          <strong>
            {linkName || "Untitled link"} · {amount || "0.00"} {asset}
          </strong>
        </div>
      ) : (
        <div className="pay-result-line pay-result-line--muted">
          <span>Status</span>
          <strong>{isBetaMode ? "Beta mode prevents live link creation" : "No payment link created yet"}</strong>
        </div>
      )}
    </PayActionCard>
  );
}

function InvoiceView() {
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("USDC");
  const [dueDate, setDueDate] = useState("");

  return (
    <PayActionCard eyebrow="Pay" title="Send invoice">
      <form className="pay-form pay-form--minimal">
        <PayField label="Customer" placeholder="Customer name" value={customer} onChange={setCustomer} />
        <PayField label="Email" placeholder="customer@example.com" type="email" value={email} onChange={setEmail} />
        <PayField label="Amount" placeholder="0.00" type="number" value={amount} onChange={setAmount} />
        <PaySelect label="Asset" options={["USDC", "SOL", "USDT"]} value={asset} onChange={setAsset} />
        <PayField label="Due date" placeholder="Due date" type="date" value={dueDate} onChange={setDueDate} />
        <PayButton disabled={isBetaMode} variant="primary">
          {isBetaMode ? "Beta mode" : "Send invoice"}
        </PayButton>
      </form>
      <div className="pay-result-line pay-result-line--muted">
        <span>Invoice preview</span>
        <strong>
          {customer || "No customer"} · {amount || "0.00"} {asset}
        </strong>
      </div>
    </PayActionCard>
  );
}

function CheckoutView() {
  const [isComplete, setIsComplete] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("USDC");

  return (
    <div className="pay-view pay-view--checkout">
      <article className="pay-checkout-card">
        <header>
          <div className="pay-merchant-mark">V</div>
          <span>{merchant || "Merchant"}</span>
        </header>
        <h2>Complete your payment</h2>
        <div className="pay-summary-box">
          <span>{description || "Payment description"}</span>
          <strong>
            {amount || "0.00"} {asset}
          </strong>
          <small>Checkout preview</small>
        </div>
        <form className="pay-form pay-form--minimal">
          <PayField label="Merchant" placeholder="Merchant name" value={merchant} onChange={setMerchant} />
          <PayField
            label="Description"
            placeholder="Payment description"
            value={description}
            onChange={setDescription}
          />
          <PayField label="Amount" placeholder="0.00" type="number" value={amount} onChange={setAmount} />
          <PaySelect label="Asset" options={["USDC", "SOL", "USDT"]} value={asset} onChange={setAsset} />
          <PayField label="Name" placeholder="Your name" />
          <PayField label="Email" placeholder="you@example.com" type="email" />
        <PayButton disabled={isBetaMode} onClick={() => setIsComplete(true)} variant="primary">
          {isBetaMode ? "Beta mode" : "Pay with Vanta"}
        </PayButton>
        </form>
        <details className="pay-other-options">
          <summary>Other payment options</summary>
          <div>
            <button type="button">Pay with wallet</button>
            <button type="button">Pay publicly</button>
          </div>
        </details>
        <div className="pay-trust-line">
          <span>Privacy rail in review</span>
          <span>Receipt included</span>
          {isBetaMode && <span>No funds move</span>}
        </div>
        <section className="pay-merchant-ops" aria-label="Merchant operations">
          <div className="pay-merchant-ops__header">
            <span className="pay-kicker">Merchant operations</span>
            <h3>Policy-legible settlement</h3>
          </div>
          <div className="pay-merchant-ops__grid">
            <div className="pay-ops-card">
              <span>Private checkout</span>
              <strong>Merchant-facing payment intake</strong>
            </div>
            <div className="pay-ops-card">
              <span>Approval boundary</span>
              <strong>Preview - approve - execute - settle</strong>
            </div>
            <div className="pay-ops-card">
              <span>Trust surface</span>
              <strong>Controlled privacy + legible trust</strong>
            </div>
          </div>
        </section>
        <div className="pay-result-line pay-result-line--muted" role="status">
          <span>Settlement lifecycle</span>
          <strong>{VANTA_PAY_PRIVATE_SETTLEMENT_SUMMARY.lifecycleModel}</strong>
        </div>
        <div className="pay-result-line pay-result-line--muted">
          <span>Refunds: {VANTA_PAY_PRIVATE_SETTLEMENT_SUMMARY.refundState}</span>
          <strong>Withdrawals: {VANTA_PAY_PRIVATE_SETTLEMENT_SUMMARY.withdrawalState}</strong>
        </div>
        <div className="pay-result-line pay-result-line--muted">
          <span>Reconciliation: {VANTA_PAY_PRIVATE_SETTLEMENT_SUMMARY.reconciliationState}</span>
          <strong>merchant-visible private settlement controls</strong>
        </div>
        {isComplete ? (
          <div className="pay-success-card">
            <strong>Checkout submitted</strong>
            <span>
              {amount || "0.00"} {asset} · {merchant || "Merchant"} · receipt pending
            </span>
            <div className="pay-inline-actions">
              <PayButton>View Receipt</PayButton>
              <PayButton>Return to Merchant</PayButton>
            </div>
          </div>
        ) : null}
      </article>
    </div>
  );
}

function WithdrawView() {
  const [asset, setAsset] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [destinationType, setDestinationType] = useState("Wallet Address");
  const [destination, setDestination] = useState("");

  return (
    <PayActionCard eyebrow="Pay" title="Withdraw">
      <form className="pay-form pay-form--minimal">
        <PaySelect label="Asset" options={["USDC", "SOL", "USDT"]} value={asset} onChange={setAsset} />
        <PayField label="Amount" placeholder="0.00" type="number" value={amount} onChange={setAmount} />
        <PaySelect
          label="Destination"
          options={["Wallet Address", "Treasury Address", "Settlement Account"]}
          value={destinationType}
          onChange={setDestinationType}
        />
        <PayField label="Address" placeholder="Destination address" value={destination} onChange={setDestination} />
        <PayButton disabled={isBetaMode} variant="primary">
          {isBetaMode ? "Beta mode" : "Withdraw"}
        </PayButton>
      </form>
      <div className="pay-result-line pay-result-line--muted">
        <span>Available</span>
        <strong>Balance unavailable until connected</strong>
      </div>
    </PayActionCard>
  );
}

export function PayPage() {
  const [view, setView] = useState<PayView>("link");

  return (
    <section className="pay-page pay-page--minimal" aria-labelledby="pay-title">
      <div className="pay-shell pay-shell--minimal">
        <header className="pay-topbar pay-topbar--minimal">
          <div>
            <span className="pay-kicker">Vanta</span>
            <h1 id="pay-title">Pay</h1>
          </div>
          <nav className="pay-subnav" aria-label="Pay actions">
            {payViews.map((item) => (
              <button
                className={view === item.id ? "pay-subnav__item pay-subnav__item--active" : "pay-subnav__item"}
                key={item.id}
                onClick={() => setView(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="pay-minimal-stage">
          {view === "link" ? <PaymentLinkView /> : null}
          {view === "invoice" ? <InvoiceView /> : null}
          {view === "checkout" ? <CheckoutView /> : null}
          {view === "withdraw" ? <WithdrawView /> : null}
        </main>
      </div>
    </section>
  );
}
