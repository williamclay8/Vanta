export type PrivacySummaryItem = {
  label: string;
  value: string;
};

type PrivacySummaryProps = {
  items: readonly PrivacySummaryItem[];
  note?: string;
  title?: string;
};

export function PrivacySummary({
  items,
  note,
  title = "Privacy summary",
}: PrivacySummaryProps) {
  return (
    <section className="privacy-summary" aria-label={title}>
      <div className="privacy-summary__header">
        <span>{title}</span>
      </div>
      <div className="privacy-summary__list">
        {items.map((item) => (
          <div key={item.label} className="privacy-summary__row">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      {note && <p className="privacy-summary__note">{note}</p>}
    </section>
  );
}
