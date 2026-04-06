import { ModulePage } from "@/components/ModulePage";

export function PayPage() {
  return (
    <ModulePage
      title="Private Pay"
      status="Planned"
      summary="Enable private payment and commerce experiences built on top of shielded balances."
      description="Private Pay extends Vanta from private state into operational commerce. It is positioned for merchant flows, settlement controls, and payment UX that treat confidentiality as a product requirement."
      primaryCardTitle="Private payment workspace"
      primaryCardCopy="The future payment experience can support invoices, payer-facing requests, and settlement summaries built on the same privacy layer established by Shield."
      previewLabel="Planned module"
      buttonLabel="Review planned scope"
      secondaryItems={[
        { label: "Invoice flow", value: "Merchant UI planned" },
        { label: "Settlement rules", value: "Configuration layer pending" },
        { label: "Receipts", value: "Private history reserved" },
      ]}
    />
  );
}
