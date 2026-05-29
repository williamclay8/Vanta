import { formatAssetAmount, type ShieldedSwapAssetKey } from "@/solana/publicSwapRoute";

export type SwapRecentSwapSummary = {
  createdAt?: number;
  inputAsset: ShieldedSwapAssetKey;
  inputAmount: number;
  outputAsset: ShieldedSwapAssetKey;
  outputAmount: number;
  outputNoteId: string;
  recordId?: string;
  storageScope?: "browser-local" | "local-session";
  transitionNoteId: string;
  venueFamily: "Aggregator" | "DLMM";
  venueName: string;
};

type SwapRecentSwapsSectionProps = {
  formatQuoteTimestamp: (value: number | undefined) => string;
  formatSummaryKey: (summary: SwapRecentSwapSummary) => string;
  formatShortSwapId: (value: string) => string;
  onOpenReceipt: (summaryKey: string) => void;
  summaries: readonly SwapRecentSwapSummary[];
};

export function SwapRecentSwapsSection({
  formatQuoteTimestamp,
  formatSummaryKey,
  formatShortSwapId,
  onOpenReceipt,
  summaries,
}: SwapRecentSwapsSectionProps) {
  return (
    <section className="swap-recent-swaps" data-vanta-swap-recent-list aria-label="Recent swaps">
      <div className="swap-recent-swaps__header">
        <span>Recent swaps</span>
        <strong>Browser-local history</strong>
      </div>
      {summaries.length > 0 ? (
        <div className="swap-recent-swaps__items" data-vanta-swap-recent-browser-local>
          {summaries.map((summary) => (
            <article
              className="swap-recent-swaps__card"
              data-vanta-swap-recent-card
              key={formatSummaryKey(summary)}
            >
              <div>
                <span>
                  {summary.storageScope === "browser-local" ? "Stored in this browser" : "Latest swap"}
                </span>
                <strong>
                  {formatAssetAmount(summary.inputAmount, summary.inputAsset)}
                  {" -> "}
                  {formatAssetAmount(summary.outputAmount, summary.outputAsset)}
                </strong>
                <p>
                  {summary.venueName} {summary.venueFamily} · Output note{" "}
                  {formatShortSwapId(summary.outputNoteId)}
                  {summary.createdAt ? ` · ${formatQuoteTimestamp(summary.createdAt)}` : ""}
                </p>
              </div>
              <button
                className="button button-ghost"
                type="button"
                onClick={() => {
                  onOpenReceipt(formatSummaryKey(summary));
                }}
              >
                Open receipt
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="swap-recent-swaps__empty" data-vanta-swap-recent-empty>
          Completed swaps with committed receipt evidence will appear here for review. Stored in this
          browser only; this history does not prove Swap production privacy.
        </p>
      )}
    </section>
  );
}
