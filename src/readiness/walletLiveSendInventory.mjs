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
          tx("spentMarkerTransaction.send({", "swap spent-marker reservation"),
          tx("swapTransaction.send({", "shielded swap transition"),
        ],
        file: "src/pages/SwapPage.tsx",
        page: "Swap",
        replacement:
          "Bind the signed swap intent to a typed intent summary, then prepare, simulate, summarize, and gate every swap transaction before wallet approval.",
        status: "requires-wallet-backed-simulation-gate",
      },
      {
        currentCallSites: [
          tx("splitSpentMarkerTransaction.send({", "partial unshield split spent-marker reservation"),
          message("signUnshieldIntent(", "SPL unshield intent signature"),
          message("signSolUnshieldIntent(", "native SOL unshield intent signature"),
          tx("spentMarkerTransaction.send({", "unshield spent-marker reservation"),
          tx("transitionTransaction.send({", "unshield transition"),
          tx("splitTransitionTransaction.send({", "partial unshield split transition"),
        ],
        file: "src/pages/UnshieldPage.tsx",
        page: "Unshield",
        replacement:
          "Bind unshield intents to typed summaries and route every spent-marker, transition, and split transition through simulate-first wallet-backed gate validation.",
        status: "requires-wallet-backed-simulation-gate",
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
