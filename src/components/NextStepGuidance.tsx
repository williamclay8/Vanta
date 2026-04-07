import { Link } from "react-router-dom";
import { useVantaNextStepGuidance } from "@/solana/useVantaNextStepGuidance";

export function NextStepGuidance() {
  const guidance = useVantaNextStepGuidance();

  return (
    <section className="next-step-guidance" aria-label="Next step guidance">
      <div>
        <span>Next step</span>
        <h2>{guidance.emphasisLabel}</h2>
        <p>{guidance.message}</p>
      </div>
      {guidance.ctaHref && guidance.ctaLabel ? (
        <Link className="button button-primary" to={guidance.ctaHref}>
          {guidance.ctaLabel}
        </Link>
      ) : null}
    </section>
  );
}
