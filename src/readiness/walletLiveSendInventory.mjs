const REQUIRED_REPLACEMENT_SEQUENCE = [
  "prepare-transaction",
  "simulate-transaction",
  "show-transaction-safety-summary",
  "validate-wallet-backed-simulation-gate",
  "request-wallet-approval",
  "submit-prepared-transaction",
];

const MESSAGE_INTENT_SEQUENCE = [
  "create-typed-intent-payload",
  "typed-intent-summary",
  "bind-intent-nonce-and-expiration",
  "wallet-message-approval",
  "verify-signed-intent-before-submit",
];

function tx(snippet, label) {
  return {
    label,
    signatureKind: "transaction-signature",
    snippet,
  };
}

function message(snippet, label) {
  return {
    label,
    signatureKind: "message-intent-signature",
    snippet,
  };
}

function adapter(snippet, label) {
  return {
    label,
    signatureKind: "wallet-adapter-boundary",
    snippet,
  };
}

export function createWalletLiveSendInventory() {
  return {
    mainnetReady: false,
    messageIntentPolicy: {
      note: "Signed message intents are not transaction sends, but they still need typed summaries, nonce/expiration binding, explicit wallet approval, and the shared message-intent safety boundary before live submission.",
      requiredSequence: MESSAGE_INTENT_SEQUENCE,
    },
    productionReady: false,
    replacementRequired: true,
    requiredReplacementSequence: REQUIRED_REPLACEMENT_SEQUENCE,
    version: "vanta-wallet-live-send-inventory-0.1",
    actionSurfaces: [
      {
        currentCallSites: [],
        adoptedCallSites: [
          tx("const splShieldTransferTransaction = useVantaSafeSendTransaction();", "SPL token shield transfer"),
          tx("VANTA_TOKEN_SAME_TRANSACTION_DEPOSIT_SIGNATURE", "SPL token shield state memo in transfer transaction"),
          tx("const nativeSolShieldTransaction = useVantaSafeSendTransaction();", "native SOL shield transfer"),
          tx("const publicRouteTransaction = useVantaSafeSendTransaction();", "public shield route transfer"),
        ],
        file: "src/pages/ShieldPage.tsx",
        page: "Shield",
        replacement:
          "Keep SPL token transfer plus same-transaction state memo, native SOL, and public-route Shield transactions behind the safe-send hook that prepares, simulates, summarizes, gates, and requests wallet approval.",
        status: "safe-send-adopted",
      },
      {
        currentCallSites: [],
        adoptedCallSites: [
          tx("const spentMarkerTransaction = useVantaSafeSendTransaction();", "send spent-marker reservation"),
          tx("const sendNoteTransaction = useVantaSafeSendTransaction();", "shielded send note transition"),
        ],
        file: "src/pages/SendPage.tsx",
        page: "Send",
        replacement:
          "Keep dormant legacy spent-marker and send-note transactions behind the safe-send hook that prepares, simulates, summarizes, gates, and requests wallet approval, and treat the active Send surface as the Private Core proof/operator lane with no wallet transaction submission.",
        status: "private-core-active-legacy-safe-send-dormant",
      },
      {
        currentCallSites: [],
        adoptedCallSites: [
          message("signSwapIntent(payload, async (message) => {", "swap intent safety boundary"),
          tx("const spentMarkerTransaction = useVantaSafeSendTransaction();", "swap spent-marker reservation"),
          tx("const swapTransaction = useVantaSafeSendTransaction();", "shielded swap transition"),
        ],
        file: "src/pages/SwapPage.tsx",
        page: "Swap",
        replacement:
          "Keep the signed swap intent behind the message-intent safety boundary, and keep swap transition transactions behind the safe-send hook that prepares, simulates, summarizes, gates, and requests wallet approval.",
        status: "safe-send-adopted",
      },
      {
        currentCallSites: [],
        adoptedCallSites: [
          adapter("createOperatorDirectUnshieldIntent", "SPL unshield operator-direct release handoff"),
          message("signSolUnshieldIntent", "native SOL unshield message-intent safety boundary"),
          tx("const splitSpentMarkerTransaction = useVantaSafeSendTransaction();", "partial unshield split spent-marker reservation"),
          tx("const splitTransitionTransaction = useVantaSafeSendTransaction();", "partial unshield split transition"),
        ],
        file: "src/pages/UnshieldPage.tsx",
        page: "Unshield",
        replacement:
          "Keep SPL Unshield on the operator-direct release lane, keep SOL Unshield behind the message-intent safety boundary, and keep the dormant partial split path behind the safe-send hook that prepares, simulates, summarizes, gates, and requests wallet approval.",
        status: "safe-send-adopted",
      },
      {
        currentCallSites: [],
        adoptedCallSites: [
          adapter("validateUmbraWalletAdapterGate", "Umbra wallet adapter validation"),
          adapter('requireUmbraWalletAdapterGate(walletAdapterGate, "message")', "Umbra message-sign adapter gate"),
          adapter('requireUmbraWalletAdapterGate(walletAdapterGate, "transaction")', "Umbra transaction-sign adapter gate"),
        ],
        file: "src/privacy/umbraClient.ts",
        page: "Umbra adapter",
        replacement:
          "Keep the adapter fail-closed behind a summary-bound wallet adapter gate, so callers pass only already summarized, simulated, and gate-accepted transactions or typed message intents.",
        status: "wallet-adapter-summary-bound",
      },
    ],
  };
}
