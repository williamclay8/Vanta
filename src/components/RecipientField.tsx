import type {
  SendRecipientInputSource,
  SendRecipientValidationResult,
} from "@/solana/sendRecipientValidation";

type RecipientFieldProps = {
  id: string;
  label: string;
  onValueChange: (value: string, inputSource: SendRecipientInputSource) => void;
  recentRecipients?: readonly string[];
  validation: SendRecipientValidationResult;
  value: string;
};

const STATUS_COPY: Record<SendRecipientValidationResult["kind"], string> = {
  empty: "Recipient address required",
  "invalid-address": "Invalid Solana address",
  "off-curve-address": "Wallet address required",
  "sol-name-unsupported": "Solana name resolution required",
  "solana-address": "Base58-valid Solana address",
  "too-long": "Recipient address too long",
};

const PASTED_RECIPIENT_COPY = "Paste validated as a Solana address";

export function RecipientField({
  id,
  label,
  onValueChange,
  recentRecipients = [],
  validation,
  value,
}: RecipientFieldProps) {
  const statusCopy = STATUS_COPY[validation.kind];

  return (
    <div className="recipient-field swap-module__field" data-vanta-send-recipient-field>
      <div className="swap-module__label-row">
        <label htmlFor={id}>{label}</label>
      </div>
      <div className="amount-field">
        <input
          id={id}
          aria-describedby={`${id}-helper ${id}-status`}
          aria-invalid={value.trim().length > 0 && !validation.ready}
          className="input-compact"
          data-vanta-send-recipient-input
          inputMode="text"
          onChange={(event) => {
            onValueChange(event.target.value, "typed");
          }}
          onPaste={(event) => {
            const pastedRecipient = event.clipboardData.getData("text").trim();

            if (!pastedRecipient) {
              return;
            }

            event.preventDefault();
            onValueChange(pastedRecipient, "pasted");
          }}
          placeholder="Recipient wallet address"
          spellCheck={false}
          value={value}
        />
      </div>
      <div
        className={`recipient-field__status recipient-field__status--${validation.tone}`}
        data-paste-validation-copy={PASTED_RECIPIENT_COPY}
        data-vanta-send-recipient-status
        id={`${id}-status`}
      >
        <strong>{statusCopy}</strong>
        <span>{validation.detail}</span>
      </div>
      <p className="recipient-field__helper shield-helper" data-vanta-send-recipient-helper id={`${id}-helper`}>
        .sol resolution is not enabled. External recipient delivery is direct-key beta only and
        not deployed recipient discovery.
      </p>
      {recentRecipients.length > 0 && (
        <div className="recipient-field__recent" data-vanta-send-recent-recipients>
          <span>Recent</span>
          {recentRecipients.map((recentRecipient) => (
            <button
              className="button button-ghost"
              key={recentRecipient}
              onClick={() => onValueChange(recentRecipient, "recent")}
              type="button"
            >
              {recentRecipient.slice(0, 4)}...{recentRecipient.slice(-4)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
