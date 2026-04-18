export function PayPage() {
  return (
    <section className="send-page pay-page">
      <div className="send-layout">
        <article className="send-card">
          <div className="send-card__header">
            <span className="eyebrow">Pay</span>
            <h2>Private Pay</h2>
          </div>

          <div className="asset-list">
            <div className="asset-row">
              <div>
                <strong>Invoices</strong>
                <span>Planned</span>
              </div>
              <small>Pending</small>
            </div>
            <div className="asset-row">
              <div>
                <strong>Requests</strong>
                <span>Planned</span>
              </div>
              <small>Pending</small>
            </div>
            <div className="asset-row">
              <div>
                <strong>Settlement</strong>
                <span>Planned</span>
              </div>
              <small>Pending</small>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
