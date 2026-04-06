export function HeroPanel() {
  return (
    <div className="hero-panel">
      <div className="hero-panel__header">
        <span>Shielded account state</span>
        <strong>Vanta Core</strong>
      </div>

      <div className="hero-balance-card">
        <p>Protected balance</p>
        <h3>284.21 SOL</h3>
        <span>Visibility limited by zk execution context</span>
      </div>

      <div className="hero-activity-list">
        <article>
          <div>
            <strong>Shield</strong>
            <span>Deposit into privacy layer</span>
          </div>
          <p>120.00 SOL</p>
        </article>
        <article>
          <div>
            <strong>Private Send</strong>
            <span>Use shielded state</span>
          </div>
          <p>18.00 SOL</p>
        </article>
        <article>
          <div>
            <strong>Private Swap</strong>
            <span>Next module</span>
          </div>
          <p>USDC to BONK</p>
        </article>
      </div>
    </div>
  );
}
