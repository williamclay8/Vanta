import type { ReactNode } from "react";
import { useState } from "react";

type PayView = "link" | "invoice" | "checkout" | "withdraw";

const payViews = [
  { id: "link", label: "Payment Link" },
  { id: "invoice", label: "Invoice" },
  { id: "checkout", label: "Checkout" },
  { id: "withdraw", label: "Withdraw" },
] satisfies readonly { id: PayView; label: string }[];

function PayButton({
  children,
  onClick,
  variant = "secondary",
}: {
  children: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      className={variant === "primary" ? "button button-primary" : "button button-ghost"}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function PayField({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="pay-field">
      <span>{label}</span>
      <input placeholder={placeholder} type={type} />
    </label>
  );
}

function PaySelect({ label, options }: { label: string; options: readonly string[] }) {
  return (
    <label className="pay-field pay-field--select">
      <span>{label}</span>
      <select defaultValue={options[0]}>
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
  return (
    <PayActionCard eyebrow="Pay" title="Create payment link">
      <form className="pay-form pay-form--minimal">
        <PayField label="Link name" placeholder="Design Retainer" />
        <PayField label="Amount" placeholder="800.00" type="number" />
        <PaySelect label="Asset" options={["USDC", "SOL", "USDT"]} />
        <PayField label="Redirect URL" placeholder="https://merchant.com/thanks" />
        <PayButton variant="primary">Create payment link</PayButton>
      </form>
      <div className="pay-result-line">
        <span>Ready link</span>
        <strong>vanta.link/design-retainer</strong>
      </div>
    </PayActionCard>
  );
}

function InvoiceView() {
  return (
    <PayActionCard eyebrow="Pay" title="Send invoice">
      <form className="pay-form pay-form--minimal">
        <PayField label="Customer" placeholder="Harper Studio" />
        <PayField label="Email" placeholder="billing@harper.co" type="email" />
        <PayField label="Amount" placeholder="800.00" type="number" />
        <PaySelect label="Asset" options={["USDC", "SOL", "USDT"]} />
        <PayField label="Due date" placeholder="2026-05-01" type="date" />
        <PayButton variant="primary">Send invoice</PayButton>
      </form>
    </PayActionCard>
  );
}

function CheckoutView() {
  const [isComplete, setIsComplete] = useState(false);

  return (
    <div className="pay-view pay-view--checkout">
      <article className="pay-checkout-card">
        <header>
          <div className="pay-merchant-mark">V</div>
          <span>Vanta Studio</span>
        </header>
        <h2>Complete your payment</h2>
        <div className="pay-summary-box">
          <span>Design Retainer</span>
          <strong>$800.00</strong>
          <small>USDC</small>
        </div>
        <form className="pay-form pay-form--minimal">
          <PayField label="Name" placeholder="Your name" />
          <PayField label="Email" placeholder="you@example.com" type="email" />
          <PayButton onClick={() => setIsComplete(true)} variant="primary">
            Pay with Vanta
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
        </div>
        {isComplete ? (
          <div className="pay-success-card">
            <strong>Payment complete</strong>
            <span>$800.00 · Vanta Studio · Receipt R-1052</span>
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
  return (
    <PayActionCard eyebrow="Pay" title="Withdraw">
      <form className="pay-form pay-form--minimal">
        <PaySelect label="Asset" options={["USDC", "SOL", "USDT"]} />
        <PayField label="Amount" placeholder="1200.00" type="number" />
        <PaySelect label="Destination" options={["Wallet Address", "Treasury Address", "Settlement Account"]} />
        <PayField label="Address" placeholder="Destination address" />
        <PayButton variant="primary">Withdraw</PayButton>
      </form>
      <div className="pay-result-line">
        <span>Available</span>
        <strong>$8,420.50</strong>
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
