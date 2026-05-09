export function HeroPanel() {
  return (
    <div className="hero-panel">
      <div className="hero-panel__header">
        <span>Private core</span>
        <strong>Vanta Core</strong>
      </div>

      <div className="hero-balance-card">
        <p>Shielded balance</p>
        <h3>284.21 SOL</h3>
        <span>Held inside private state</span>
      </div>

      <div className="hero-activity-list">
        <article>
          <div>
            <strong>Shield</strong>
            <span>Enter</span>
          </div>
          <p>120.00 SOL</p>
        </article>
        <article>
          <div>
            <strong>Guarded Send</strong>
            <span>Move</span>
          </div>
          <p>18.00 SOL</p>
        </article>
        <article>
          <div>
            <strong>Unshield</strong>
            <span>Exit</span>
          </div>
          <p>42.00 SOL</p>
        </article>
      </div>
    </div>
  );
}
