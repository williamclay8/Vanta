import { ModulePage } from "@/components/ModulePage";

export function LaunchPage() {
  return (
    <ModulePage
      title="Private Launch"
      status="Future"
      summary="Explore future privacy-aware token and ecosystem workflows inside the broader Vanta network."
      description="Private Launch is intentionally roadmap-level. It signals where the broader Vanta network can extend once Shield, Send, Swap, and Pay primitives are in place."
      primaryCardTitle="Launch control center"
      primaryCardCopy="This space is reserved for future launch policies, participant access controls, and distribution workflows that benefit from stronger privacy defaults."
      previewLabel="Future module"
      buttonLabel="View future direction"
      secondaryItems={[
        { label: "Distribution mode", value: "Roadmap configuration" },
        { label: "Participant policy", value: "Privacy controls reserved" },
        { label: "Treasury controls", value: "Future infrastructure layer" },
      ]}
    />
  );
}
