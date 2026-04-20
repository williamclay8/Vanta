import { getUmbraRuntimeReadiness } from "./umbraConfig";
import { getUmbraMixerProverStatus } from "./umbraOperations";
import { getUmbraExternalCapabilityProfile } from "./umbraCapabilityProfile";
import { planShieldRoute } from "./privacyRoutePlanner";
import { getVantaLocalCapabilityProfile } from "./vantaLocalAdapter";

export function getVantaUmbraBenchmarkSnapshot() {
  const vanta = getVantaLocalCapabilityProfile();
  const umbra = getUmbraExternalCapabilityProfile();
  const readiness = getUmbraRuntimeReadiness();
  const prover = getUmbraMixerProverStatus();

  return {
    nextBestStep:
      readiness.ready && prover.ready
        ? "Wire Umbra mixer create/claim flows behind the adapter."
        : "Use Umbra encrypted-balance registration, query, deposit, and withdraw as the first live benchmark lane while proving support remains gated.",
    profiles: {
      umbra,
      vanta,
    },
    prover,
    readiness,
    routeSamples: umbra.assets.map((asset) =>
      planShieldRoute({
        amountBaseUnits: 1n,
        fromMintAddress: asset.mintAddress,
        preferUmbra: true,
        toMintAddress: asset.mintAddress,
      }),
    ),
  };
}
