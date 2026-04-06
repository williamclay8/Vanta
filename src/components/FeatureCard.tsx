import type { Capability } from "@/data/site";

export function FeatureCard({ title, status, summary, details }: Capability) {
  return (
    <article className="feature-card">
      <div className="feature-card__top">
        <span>{status}</span>
        <h3>{title}</h3>
      </div>
      <p className="feature-card__summary">{summary}</p>
      <p className="feature-card__details">{details}</p>
    </article>
  );
}
