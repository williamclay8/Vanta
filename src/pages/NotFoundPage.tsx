import { Link } from "react-router-dom";

type NotFoundSurface = "app" | "docs" | "site";

type NotFoundPageProps = {
  surface?: NotFoundSurface;
};

const surfaceCopy: Record<NotFoundSurface, string> = {
  app: "That Vanta app lane is not available in this build.",
  docs: "That docs page is not published in this build.",
  site: "That Vanta page is not published in this build.",
};

export function NotFoundPage({ surface = "site" }: NotFoundPageProps) {
  return (
    <section className={`route-fallback route-fallback--${surface}`} data-route-fallback={surface}>
      <span className="route-fallback__eyebrow">Route check</span>
      <h1>Page not found</h1>
      <p>
        <strong>Nothing moved.</strong> {surfaceCopy[surface]}{" "}
        Beta routes are visible, but production privacy is not enabled.
      </p>
      <div className="route-fallback__actions" aria-label="Not found recovery actions">
        <Link className="route-fallback__action route-fallback__action--primary" to="/app/shield">
          Start with Shield
        </Link>
        <Link className="route-fallback__action" to="/docs/security">
          Read security limits
        </Link>
        <Link className="route-fallback__action" to="/docs/trust">
          Review trust docs
        </Link>
        <Link className="route-fallback__action" to="/">
          Vanta home
        </Link>
      </div>
      <dl className="route-fallback__truth" aria-label="Route fallback truth boundary">
        <div>
          <dt>Claim status</dt>
          <dd>Production privacy is not enabled.</dd>
        </div>
        <div>
          <dt>Next step</dt>
          <dd>Use a checked route or read the current security limits.</dd>
        </div>
      </dl>
    </section>
  );
}
