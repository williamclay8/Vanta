import { Link } from "react-router-dom";
import { usePrivacyFlow } from "@/data/context/PrivacyFlowContext";

export function ProofTrustPanels() {
  const { privateCoreReleaseHandoffState, privateCoreReleasePackageState } = usePrivacyFlow();

  const releaseStatus =
    privateCoreReleasePackageState?.packageStatusLabel ??
    privateCoreReleaseHandoffState?.handoffStatusLabel ??
    "Release package unavailable";
  const releaseNote =
    privateCoreReleasePackageState?.packagePrimaryNote ??
    privateCoreReleaseHandoffState?.handoffPrimaryNote ??
    "The primary send to unshield lane has not assembled a final package yet.";

  const primaryHref =
    privateCoreReleasePackageState?.packageStatusLabel === "Release package ready"
      ? "/app/unshield"
      : privateCoreReleaseHandoffState?.nextActionHref;

  const packageIdentity =
    privateCoreReleasePackageState?.packageIdentityLabel ?? "No package identity yet";
  const packageGate =
    privateCoreReleasePackageState?.gateStatusLabel ?? "Gate not available";
  const packageGenerated =
    privateCoreReleasePackageState?.summaryGeneratedLabel ?? "Generated after a package exists";
  const packageLineage =
    privateCoreReleasePackageState?.lineageSummaryLabel ??
    privateCoreReleaseHandoffState?.noteSummary ??
    "Lineage appears after send and unshield evidence exist";

  const trustPacketFacts = [
    {
      label: "Packet",
      value: packageIdentity,
      detail: `${releaseStatus} · ${packageGenerated}`,
    },
    {
      label: "Gate",
      value: packageGate,
      detail: privateCoreReleasePackageState?.gatePrimaryNote ?? releaseNote,
    },
    {
      label: "Lineage",
      value: packageLineage,
      detail: "Connects proof, send, release, and operator status when available.",
    },
    {
      label: "Boundary",
      value: "Beta/test settlement",
      detail: "Production privacy is not enabled. Not anonymous, untraceable, or live private settlement.",
    },
  ];

  const verificationSurfaces = [
    {
      command: "private-core:operator-status",
      purpose: "Human operator state",
    },
    {
      command: "private-core:operator-status-json",
      purpose: "Machine-readable state",
    },
    {
      command: "private-core:release-package",
      purpose: "Trust packet summary",
    },
    {
      command: "private-core:release-package-json",
      purpose: "Trust packet JSON",
    },
  ];

  return (
    <>
      <div className="dashboard-trust-packet proof-trust-packet" aria-label="Latest trust packet">
        <span className="eyebrow">Latest Trust Packet</span>
        <h3>{releaseStatus}</h3>
        <p>{releaseNote}</p>
        <dl>
          {trustPacketFacts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>
                <strong>{fact.value}</strong>
                <small>{fact.detail}</small>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="dashboard-verification-card proof-verification-card" aria-label="Reviewer verification surfaces">
        <span className="eyebrow">Reviewer Verification</span>
        <h3>Operator-visible, beta-truthful, reproducible</h3>
        <p>
          A reviewer or counterparty should be able to inspect the packet and run the matching
          operator/status command instead of trusting marketing copy.
        </p>
        <Link className="button button-primary" to={primaryHref ?? "/app/send"}>
          {privateCoreReleasePackageState ? "Verify packet" : "Create packet"}
        </Link>
        <div className="dashboard-verification-card__commands">
          {verificationSurfaces.map((surface) => (
            <div key={surface.command}>
              <code>npm run {surface.command}</code>
              <small>{surface.purpose}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-release-card proof-release-card">
        <div>
          <span className="eyebrow">Reviewer Package</span>
          <h3>{releaseStatus}</h3>
          <p>{releaseNote}</p>
        </div>

        <div className="dashboard-release-card__meta">
          <small>
            {privateCoreReleasePackageState?.packageIdentityLabel ??
              "Primary send -> unshield package"}
          </small>
        </div>
      </div>
    </>
  );
}
