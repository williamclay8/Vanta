export function PayPage() {
  return (
    <section className="send-page pay-page">
      <div className="send-layout">
        <article className="send-card send-card--workspace">
          <div className="shield-card__header">
            <div>
              <span>Pay</span>
            </div>
          </div>

          <div className="shield-form swap-widget">
            <div className="swap-module">
              <div className="swap-module__field">
                <div className="swap-module__label-row">
                  <span>Private Pay</span>
                </div>
                <div className="swap-quote-line">
                  <strong>Coming soon</strong>
                  <span>Invoices, requests, and settlement</span>
                </div>
              </div>
              <div className="shield-form__actions">
                <button className="button button-primary" type="button" disabled>
                  Pay soon
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
