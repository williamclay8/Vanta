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
      note: "Signed message intents are not transaction sends, but they still need typed summaries, nonce/expiration binding, and explicit wallet approval before live submission.",
      requiredSequence: MESSAGE_INTENT_SEQUENCE,
    },
    productionReady: false,
    replacementRequired: true,
    requiredReplacementSequence: REQUIRED_REPLACEMENT_SEQUENCE,
    version: "vanta-wallet-live-send-inventory-0.1",
    actionSurfaces: [
      {
        currentCallSites: [
          tx("supportedToken.send({", "SPL token shield transfer"),
        ],
        adoptedCallSites: [
          tx("const nativeSolShieldTransaction = useVantaSafeSendTransaction();", "native SOL shield transfer"),
          tx("const stateTransaction = useVantaSafeSendTransaction();", "shield state transition"),
          tx("const publicRouteTransaction = useVantaSafeSendTransaction();", "public shield route transfer"),
        ],
        file: "src/pages/ShieldPage.tsx",
        page: "Shield",
        replacement:
          "Keep the SPL token transfer call site visible, and keep native SOL, state, and public-route Shield transactions behind the safe-send hook that prepares, simulates, summarizes, gates, and requests wallet approval.",
        status: "partial-safe-send-adopted",
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
          "Keep spent-marker and send-note transactions behind the safe-send hook that prepares, simulates, summarizes, gates, and requests wallet approval.",
        status: "safe-send-adopted",
      },
      {
        currentCallSites: [
          message("signSwapIntent(payload, walletSession.signMessage)", "swap intent signature"),
        ],
        adoptedCallSites: [
          tx("const spentMarkerTransaction = useVantaSafeSendTransaction();", "swap spent-marker reservation"),
          tx("const swapTransaction = useVantaSafeSendTransaction();", "shielded swap transition"),
        ],
        file: "src/pages/SwapPage.tsx",
        page: "Swap",
        replacement:
          "Keep the signed swap intent visible for typed-intent hardening, and keep swap transition transactions behind the safe-send hook that prepares, simulates, summarizes, gates, and requests wallet approval.",
        status: "partial-safe-send-adopted",
      },
      {
        currentCallSites: [
          message("signUnshieldIntent(", "SPL unshield intent signature"),
          message("signSolUnshieldIntent(", "native SOL unshield intent signature"),
        ],
        adoptedCallSites: [
          tx("const splitSpentMarkerTransaction = useVantaSafeSendTransaction();", "partial unshield split spent-marker reservation"),
          tx("const spentMarkerTransaction = useVantaSafeSendTransaction();", "unshield spent-marker reservation"),
          tx("const transitionTransaction = useVantaSafeSendTransaction();", "unshield transition"),
          tx("const splitTransitionTransaction = useVantaSafeSendTransaction();", "partial unshield split transition"),
        ],
        file: "src/pages/UnshieldPage.tsx",
        page: "Unshield",
        replacement:
          "Keep unshield signed intents visible for typed-intent hardening, and keep spent-marker, transition, and split transition transactions behind the safe-send hook that prepares, simulates, summarizes, gates, and requests wallet approval.",
        status: "partial-safe-send-adopted",
      },
      {
        currentCallSites: [
          adapter("walletSession.signMessage!", "Umbra message-sign adapter boundary"),
          adapter("walletSession.signTransaction!", "Umbra transaction-sign adapter boundary"),
        ],
        file: "src/privacy/umbraClient.ts",
        page: "Umbra adapter",
        replacement:
          "Keep the adapter narrow: callers must pass only already summarized, simulated, and gate-accepted transactions or typed message intents.",
        status: "requires-wallet-backed-simulation-gate",
      },
    ],
  };
}
