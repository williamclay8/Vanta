import type { ReactNode } from "react";
import { useState } from "react";
import { isBetaMode } from "@/config/deploymentMode";
import { buildVantaPayApprovalPacket } from "@/pay/vantaPayApprovalPacket";
import { createVantaPayMerchantControlPlane } from "@/pay/vantaPayMerchantControlPlane";
import { VANTA_PAY_MERCHANT_DEMO_CONTENT } from "@/pay/vantaPayMerchantDemoContent";
import { VANTA_PRICING_COPY, describePricingForSurface } from "@/pricing/vantaPricing";

type PayView = "control" | "link" | "invoice" | "checkout" | "withdraw";

const payViews = [
  { id: "control", label: "Merchant control" },
  { id: "link", label: "Create link" },
  { id: "invoice", label: "Send invoice" },
  { id: "checkout", label: "Preview checkout" },
  { id: "withdraw", label: "Withdraw funds" },
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
    <PayActionCard eyebrow="Pay" title="Create a shareable payment link">
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
          <span>Next step</span>
          <strong>{isBetaMode ? "Beta mode prevents live link creation" : "Fill in the details to create a link."}</strong>
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

function MerchantTrustPacket() {
  const approvalBoundary = buildVantaPayApprovalPacket().phaseOrder.join(" -> ");

  return (
    <section className="pay-trust-packet" aria-label="Pay trust packet">
      <div className="pay-merchant-ops__header">
        <span className="pay-kicker">Trust packet</span>
        <h3>Merchant settlement operations</h3>
        <p className="pay-merchant-ops__note">
          One place for the payment lifecycle, privacy boundary, and current beta limits.
        </p>
      </div>
      <div className="pay-trust-packet__grid">
        <div>
          <span>What is private</span>
          <strong>Settlement route preview and receipt linkage</strong>
        </div>
        <div>
          <span>What is visible</span>
          <strong>Merchant balances, refunds, withdrawals, and reconciliation state</strong>
        </div>
        <div>
          <span>Policy mode</span>
          <strong>Policy-legible settlement preview</strong>
        </div>
        <div>
          <span>Transaction evidence</span>
          <strong>Receipt, approval, and settlement trace preview</strong>
        </div>
        <div>
          <span>Approval boundary</span>
          <strong>{approvalBoundary}</strong>
        </div>
      </div>
    </section>
  );
}

function MerchantControlPlanePanel() {
  const controlPlane = createVantaPayMerchantControlPlane();
  const approvalBoundary = buildVantaPayApprovalPacket().phaseOrder.join(" -> ");
  const hasAvailableBalances = controlPlane.balances.available.length > 0;
  const hasRefunds = controlPlane.refunds.length > 0;
  const hasWithdrawals = controlPlane.withdrawals.length > 0;

  return (
    <aside
      className="pay-merchant-console-panel"
      aria-label="Merchant control plane"
      data-approval-phase={controlPlane.approvalPhase}
      data-pay-surface="merchant-control-plane"
    >
      <section className="pay-merchant-ops" aria-label="Merchant operations">
        <div className="pay-merchant-ops__header">
          <span className="pay-kicker">{VANTA_PAY_MERCHANT_DEMO_CONTENT.eyebrow}</span>
          <h3>{VANTA_PAY_MERCHANT_DEMO_CONTENT.title}</h3>
          <p className="pay-merchant-ops__note">
            {VANTA_PAY_MERCHANT_DEMO_CONTENT.body}
          </p>
        </div>
        <div className="pay-merchant-ops__grid">
          <div className="pay-ops-card">
            <span>Checkout preview</span>
            <strong>Merchant-facing payment intake</strong>
          </div>
          <div className="pay-ops-card">
            <span>Approval boundary</span>
            <strong>{approvalBoundary}</strong>
          </div>
          <div className="pay-ops-card">
            <span>Trust surface</span>
            <strong>Policy-legible settlement preview</strong>
          </div>
        </div>
      </section>
      <section className="pay-control-plane" aria-label="Merchant control plane">
        <div className="pay-merchant-ops__header">
          <span className="pay-kicker">Merchant control plane</span>
          <h3>Merchant balances and pending work</h3>
          <p className="pay-merchant-ops__note">
            Balances, refunds, withdrawals, and exports update from the merchant control plane.
          </p>
        </div>
        <div className="pay-control-grid">
          <article className="pay-console-card" data-control-plane-section="balances">
            <span>Available balances</span>
            {hasAvailableBalances ? (
              controlPlane.balances.available.map((balance) => (
                <div
                  data-balance-asset={balance.asset}
                  data-balance-available={balance.amount}
                  key={balance.asset}
                >
                  <strong>{balance.asset}</strong>
                  <small>{balance.amount} available</small>
                </div>
              ))
            ) : (
              <div className="pay-console-empty">No available balances</div>
            )}
          </article>
          <article className="pay-console-card" data-control-plane-section="refunds">
            <span>Refund queue</span>
            {hasRefunds ? (
              controlPlane.refunds.map((refund) => (
                <div data-refund-id={refund.id} data-refund-status={refund.status} key={refund.id}>
                  <strong>{refund.id}</strong>
                  <small>
                    {refund.amount} {refund.asset} · {refund.status}
                  </small>
                </div>
              ))
            ) : (
              <div className="pay-console-empty">No refunds queued</div>
            )}
          </article>
        </div>
        <div className="pay-control-grid">
          <article className="pay-console-card" data-control-plane-section="withdrawals">
            <span>Withdrawal queue</span>
            {hasWithdrawals ? (
              controlPlane.withdrawals.map((withdrawal) => (
                <div
                  data-withdrawal-id={withdrawal.id}
                  data-withdrawal-status={withdrawal.status}
                  key={withdrawal.id}
                >
                  <strong>{withdrawal.id}</strong>
                  <small>
                    {withdrawal.amount} {withdrawal.asset} · {withdrawal.status}
                  </small>
                </div>
              ))
            ) : (
              <div className="pay-console-empty">No withdrawals queued</div>
            )}
          </article>
          <article className="pay-console-card" data-control-plane-section="reconciliation">
            <span>Reconciliation export</span>
            <strong data-console-field="reconciliation-records">{controlPlane.reconciliation.recordsLabel}</strong>
            <small data-console-field="reconciliation-window">{controlPlane.reconciliation.exportWindow}</small>
            <small data-console-field="reconciliation-state">{controlPlane.reconciliation.state}</small>
          </article>
        </div>
      </section>
      <div className="pay-result-line pay-result-line--muted" role="status">
        <span>Settlement lifecycle</span>
        <strong>{approvalBoundary}</strong>
      </div>
      <div className="pay-result-line pay-result-line--muted">
        <span>Refunds: merchant-visible</span>
        <strong>{hasRefunds ? `${controlPlane.refunds.length} refunds queued` : "No refunds queued"}</strong>
      </div>
      <div className="pay-result-line pay-result-line--muted">
        <span>Withdrawals: merchant-visible</span>
        <strong>
          {hasWithdrawals ? `${controlPlane.withdrawals.length} withdrawals queued` : "No withdrawals queued"}
        </strong>
      </div>
      <div className="pay-result-line pay-result-line--muted">
        <span>Reconciliation: merchant-visible</span>
        <strong>{controlPlane.reconciliation.state}</strong>
      </div>
    </aside>
  );
}

function PayPricingCard() {
  const payPricing = describePricingForSurface("pay");

  return (
    <aside className="pay-pricing-card" aria-label="Vanta pricing">
      <span className="pay-kicker">Pricing</span>
      <h3>{VANTA_PRICING_COPY.headline}</h3>
      <p>{payPricing.passThroughLabel}</p>
      <p>{VANTA_PRICING_COPY.passThrough}</p>
      <small>No billing starts from checkout preview alone.</small>
    </aside>
  );
}

function MerchantControlView({ onSelectWorkflow }: { onSelectWorkflow: (view: PayView) => void }) {
  const workflows = payViews.filter((item) => item.id !== "control");

  return (
    <div className="pay-view pay-view--control">
      <MerchantTrustPacket />
      <MerchantControlPlanePanel />
      <section className="pay-workflow-panel" aria-label="Pay workflows">
        <div className="pay-merchant-ops__header">
          <span className="pay-kicker">Workflows</span>
          <h3>Open workflow</h3>
          <p className="pay-merchant-ops__note">
            Create links, send invoices, preview checkout, or prepare withdrawals from the same control plane.
          </p>
        </div>
        <div className="pay-workflow-grid">
          {workflows.map((workflow) => (
            <button
              className="pay-workflow-card"
              key={workflow.id}
              onClick={() => onSelectWorkflow(workflow.id)}
              type="button"
            >
              <span>{workflow.label}</span>
              <strong>Open workflow</strong>
            </button>
          ))}
        </div>
      </section>
      <PayPricingCard />
    </div>
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
        <h2>Pay with Vanta</h2>
        <div className="pay-summary-box">
          <span>{description || "Payment description"}</span>
          <strong>
            {amount || "0.00"} {asset}
          </strong>
          <small>Checkout preview</small>
        </div>
        <form aria-label="Checkout form" className="pay-form pay-form--minimal">
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
          <span>Payment route preview</span>
          <span>Receipt path preview</span>
          {isBetaMode && <span>No funds move</span>}
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
      <MerchantControlPlanePanel />
      <PayPricingCard />
    </div>
  );
}

function WithdrawView() {
  const [asset, setAsset] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [destinationType, setDestinationType] = useState("Wallet Address");
  const [destination, setDestination] = useState("");

  return (
    <PayActionCard eyebrow="Pay" title="Withdraw funds">
      <form aria-label="Withdraw form" className="pay-form pay-form--minimal">
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
          {isBetaMode ? "Beta mode" : "Withdraw funds"}
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
  const [view, setView] = useState<PayView>("control");

  return (
    <section className="pay-page pay-page--minimal" aria-labelledby="pay-title">
      <div className="pay-shell pay-shell--minimal">
        <header className="pay-topbar pay-topbar--minimal pay-page__hero product-intro">
          <div>
            <span className="pay-kicker product-intro__eyebrow">Get paid</span>
            <h1 id="pay-title">Pay</h1>
            <p>Create a payment request, preview checkout, and inspect merchant settlement controls.</p>
          </div>
          <nav className="pay-subnav" aria-label="Pay actions">
            {payViews.map((item) => (
              <button
                aria-label={item.label}
                aria-pressed={view === item.id}
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
          {view === "control" ? <MerchantControlView onSelectWorkflow={setView} /> : null}
          {view === "link" ? <PaymentLinkView /> : null}
          {view === "invoice" ? <InvoiceView /> : null}
          {view === "checkout" ? <CheckoutView /> : null}
          {view === "withdraw" ? <WithdrawView /> : null}
        </main>
      </div>
    </section>
  );
}
