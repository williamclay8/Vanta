import { getUnshieldTrustContract } from "@/solana/unshieldTrustContract";

type UnshieldPageHeroProps = {
  unshieldTrustContract?: ReturnType<typeof getUnshieldTrustContract>;
};

export function UnshieldPageHero({
  unshieldTrustContract = getUnshieldTrustContract(),
}: UnshieldPageHeroProps) {
  return (
    <div className="module-page__hero send-page__hero product-intro">
      <div>
        <span className="eyebrow product-intro__eyebrow">Move out</span>
        <h2>Unshield</h2>
        <p className="product-intro__lede">
          Withdraw to your regular wallet once the on-chain verifier ships.
          Withdrawals are paused in this build — see below.
        </p>
        <p className="product-intro__meta">
          Beta. Only to the wallet you used to shield them.
        </p>
      </div>

      <div className="module-state">
        <strong>Beta</strong>
        <details className="module-state__details">
          <summary>Moving assets from shielded to unshielded</summary>
          <p>
            {unshieldTrustContract.claimControls.productionPrivacyClaimsLocked
              ? unshieldTrustContract.visibleStatusCopy
              : "Production Unshield privacy claims are unlocked by current evidence."}
            Current Unshield releases only to the connected requester/depositor wallet that signs the exit intent. Fresh-address exits are disabled until the destination is proof-bound.
          </p>
        </details>
      </div>
    </div>
  );
}
