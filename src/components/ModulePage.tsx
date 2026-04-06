type ModulePageProps = {
  title: string;
  status: string;
  summary: string;
  description: string;
  primaryCardTitle: string;
  primaryCardCopy: string;
  previewLabel?: string;
  buttonLabel?: string;
  secondaryItems: Array<{
    label: string;
    value: string;
  }>;
};

export function ModulePage({
  title,
  status,
  summary,
  description,
  primaryCardTitle,
  primaryCardCopy,
  previewLabel = "Workflow preview",
  buttonLabel = "View module scope",
  secondaryItems,
}: ModulePageProps) {
  return (
    <section className="module-page">
      <div className="module-page__hero">
        <div>
          <span className="eyebrow">{status}</span>
          <h2>{title}</h2>
          <p>{summary}</p>
        </div>
        <div className="module-state">
          <strong>Current state</strong>
          <p>{description}</p>
        </div>
      </div>

      <div className="module-grid">
        <article className="module-card module-card--primary">
          <span>{previewLabel}</span>
          <h3>{primaryCardTitle}</h3>
          <p>{primaryCardCopy}</p>
          <button className="button button-primary" type="button">
            {buttonLabel}
          </button>
        </article>

        <article className="module-card">
          <span>System placeholders</span>
          <div className="placeholder-list">
            {secondaryItems.map((item) => (
              <div key={item.label} className="placeholder-row">
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="module-card">
          <span>Integration boundary</span>
          <p>
            This screen is intentionally scaffolded for honest product demos
            today and for future wallet connection, proving state, route
            introspection, and transaction lifecycle data.
          </p>
        </article>
      </div>
    </section>
  );
}
