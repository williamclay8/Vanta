import { ModulePage } from "@/components/ModulePage";

export function SwapPage() {
  return (
    <ModulePage
      title="Private Swap"
      status="Next"
      summary="Exchange assets from shielded state through a future privacy-preserving swap workflow."
      description="Private Swap extends the same shielded state layer into execution. Once assets are inside Vanta, swap becomes the next natural workflow for traders and treasury operators."
      primaryCardTitle="Private execution preview"
      primaryCardCopy="The future swap experience can present quotes, route assumptions, and execution checkpoints in a clean interface built on top of the same shielded asset foundation."
      previewLabel="Next module"
      buttonLabel="See next scope"
      secondaryItems={[
        { label: "Quote layer", value: "Aggregator boundary reserved" },
        { label: "Execution policy", value: "Visibility controls pending" },
        { label: "Settlement", value: "Private receipt layer planned" },
      ]}
    />
  );
}
