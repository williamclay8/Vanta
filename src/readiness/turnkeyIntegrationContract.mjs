export function createVantaTurnkeyIntegrationContract() {
  return {
    version: "vanta-turnkey-integration-contract-0.1",
    status: "sdk-installed-governed-integration-no-live-credentials",
    productionReady: false,
    mainnetReady: false,
    liveSigningEnabled: false,
    liveBroadcastEnabled: false,
    rootCredentialsAutonomousUseAllowed: false,
    browserBundleUseAllowed: false,
    custodyClaimAllowed: false,
    sdkPackages: [
      {
        name: "@turnkey/sdk-server",
        version: "6.0.0",
        role: "server-side stamped Turnkey API client",
      },
      {
        name: "@turnkey/solana",
        version: "1.1.29",
        role: "Solana TurnkeySigner integration for controlled server workflows",
      },
    ],
    directBrowserDependenciesAllowed: [],
    docsRefs: [
      "https://docs.turnkey.com/llms.txt",
      "https://docs.turnkey.com/sdks/javascript-server",
      "https://docs.turnkey.com/networks/solana",
      "https://docs.turnkey.com/developer-reference/api-overview/stamps",
    ],
    workflowRefs: [
      "/Users/clay/.agents/skills/turnkey-agent-skills/SKILL.md",
      "/Users/clay/.agents/skills/turnkey-agent-skills/references/vanta-turnkey-workflows.md",
    ],
    localRefs: ["docs/turnkey-integration.md"],
    secretRefs: [
      "VANTA_TURNKEY_ORGANIZATION_ID_REF",
      "VANTA_TURNKEY_API_PUBLIC_KEY_REF",
      "VANTA_TURNKEY_API_PRIVATE_KEY_REF",
      "VANTA_TURNKEY_SIGN_WITH_REF",
      "VANTA_TURNKEY_POLICY_ID_REF",
    ],
    blockedActions: [
      "root-credential-autonomous-use",
      "root-key-in-client-bundle",
      "private-api-key-read-print-or-commit",
      "wallet-delete-or-export-programmatically",
      "policy-mutation-without-exact-approval",
      "activity-approval-bulk-or-unreviewed",
      "sign-and-broadcast-without-simulation-summary-and-approval",
      "real-funds-or-mainnet-action-without-vanta-approval-window",
      "production-custody-or-privacy-claim-elevation",
    ],
    requiredVerificationCommands: [
      "npm run turnkey:integration-contract-check",
      "npm run wallet:signing-safety-check",
      "npm run mainnet:secret-handling-check",
      "npm run mainnet:wallet-signing-status-check",
      "npm run mainnet:wallet-signing-evidence-check",
    ],
    allowedFirstUse: [
      "read-only docs research",
      "local type/import verification",
      "devnet/testnet or no-funds signing design",
      "policy template drafting without mutation",
      "activity monitoring design without approval",
    ],
    nextSafeStep:
      "Add a server-only Turnkey adapter behind explicit env-ref gating and a no-live-call dry run before any credentialed Turnkey API call.",
  };
}
