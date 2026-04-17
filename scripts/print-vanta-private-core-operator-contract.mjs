const args = process.argv.slice(2);
const baseUrl = resolveBaseUrl(args);
const jsonMode = args.includes("--json");

try {
  const contract = await requestJson("/state/private-core-contract");
  const surface = buildContractSurface(contract);

  if (jsonMode) {
    console.log(JSON.stringify(surface, null, 2));
    process.exit(0);
  }

  printLine("Operator", baseUrl);
  printLine("Contract state version", String(contract.stateVersion ?? "unknown"));
  printLine("Contract version", String(contract.contractVersion ?? "unknown"));
  printLine("Summary compatibility", String(contract.summaryVersion ?? "unknown"));
  printLine("Supported send lane version", String(contract.supportedSendLaneVersion ?? "unknown"));
  printLine("Supported send lane kind", contract.supportedSendLaneKind ?? "Unavailable");
  printLine("Supported send lane status", contract.supportedSendLaneStatus ?? "Unavailable");
  printLine("Supported send lane note", contract.supportedSendLaneNote ?? "Unavailable");
  printLine(
    "Supported send v1 decision",
    contract.supportedSendV1Decision ?? "Unavailable",
  );
  printLine(
    "Supported send v1 decision note",
    contract.supportedSendV1DecisionNote ?? "Unavailable",
  );
  printLine(
    "Supported unshield lane version",
    String(contract.supportedUnshieldLaneVersion ?? "unknown"),
  );
  printLine("Supported unshield lane kind", contract.supportedUnshieldLaneKind ?? "Unavailable");
  printLine(
    "Supported unshield lane status",
    contract.supportedUnshieldLaneStatus ?? "Unavailable",
  );
  printLine("Supported unshield lane note", contract.supportedUnshieldLaneNote ?? "Unavailable");
  printLine(
    "Supported unshield v1 decision",
    contract.supportedUnshieldV1Decision ?? "Unavailable",
  );
  printLine(
    "Supported unshield v1 decision note",
    contract.supportedUnshieldV1DecisionNote ?? "Unavailable",
  );
  printLine(
    "Supported release lane version",
    String(contract.supportedReleaseLaneVersion ?? "unknown"),
  );
  printLine("Supported release lane kind", contract.supportedReleaseLaneKind ?? "Unavailable");
  printLine("Supported release lane status", contract.supportedReleaseLaneStatus ?? "Unavailable");
  printLine("Supported release lane note", contract.supportedReleaseLaneNote ?? "Unavailable");
  printLine(
    "Supported release v1 decision",
    contract.supportedReleaseV1Decision ?? "Unavailable",
  );
  printLine(
    "Supported release v1 decision note",
    contract.supportedReleaseV1DecisionNote ?? "Unavailable",
  );
  printLine(
    "Supported swap lane version",
    String(contract.supportedSwapLaneVersion ?? "unknown"),
  );
  printLine("Supported swap lane kind", contract.supportedSwapLaneKind ?? "Unavailable");
  printLine("Supported swap lane status", contract.supportedSwapLaneStatus ?? "Unavailable");
  printLine("Supported swap lane note", contract.supportedSwapLaneNote ?? "Unavailable");
  printLine(
    "Supported swap v1 decision",
    contract.supportedSwapV1Decision ?? "Unavailable",
  );
  printLine(
    "Supported swap v1 decision note",
    contract.supportedSwapV1DecisionNote ?? "Unavailable",
  );
  printLine("Supported swap v1 role", contract.supportedSwapV1Role ?? "Unavailable");
  printLine("Supported swap v1 role note", contract.supportedSwapV1RoleNote ?? "Unavailable");
  printLine("Supported swap venue", contract.supportedSwapVenue ?? "Unavailable");
  printLine(
    "Supported swap output model",
    contract.supportedSwapOutputModel ?? "Unavailable",
  );
  printLine(
    "Supported swap root basis",
    contract.supportedSwapResultingRootBasis === "client-declared"
      ? "Client-declared"
      : "Unavailable",
  );
  printLine(
    "Supported swap input-root policy",
    contract.supportedSwapInputRootPolicy ===
      "latest-registered-root-with-linked-registration-proof"
      ? "Latest registered root with linked registration proof"
      : "Unavailable",
  );
  printLine(
    "Supported swap output registration",
    contract.supportedSwapOutputRegistrationPolicy ===
      "resulting-root-must-register-as-swap-output"
      ? "Resulting root must register as swap output"
      : "Unavailable",
  );
  printLine("Supported flow version", String(contract.supportedFlowVersion ?? "unknown"));
  printLine("Supported flow kind", contract.supportedFlowKind ?? "Unavailable");
  printLine("Supported flow status", contract.supportedFlowStatus ?? "Unavailable");
  printLine("Supported flow note", contract.supportedFlowNote ?? "Unavailable");
  printLine(
    "Supported shipping decision version",
    String(contract.supportedShippingDecisionVersion ?? "unknown"),
  );
  printLine(
    "Supported shipping decision kind",
    contract.supportedShippingDecisionKind ?? "Unavailable",
  );
  printLine(
    "Supported shipping decision note",
    contract.supportedShippingDecisionNote ?? "Unavailable",
  );
  printLine(
    "Supported operator status version",
    String(contract.supportedOperatorStatusVersion ?? "unknown"),
  );
  printLine(
    "Supported operator status kind",
    contract.supportedOperatorStatusKind ?? "Unavailable",
  );
  printLine(
    "Supported operator status note",
    contract.supportedOperatorStatusNote ?? "Unavailable",
  );
  printLine(
    "Supported operator status gate version",
    String(contract.supportedOperatorStatusGateVersion ?? "unknown"),
  );
  printLine(
    "Supported operator status gate kind",
    contract.supportedOperatorStatusGateKind ?? "Unavailable",
  );
  printLine(
    "Supported operator status gate note",
    contract.supportedOperatorStatusGateNote ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot version",
    String(contract.supportedOperatorSnapshotVersion ?? "unknown"),
  );
  printLine(
    "Supported operator snapshot kind",
    contract.supportedOperatorSnapshotKind ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot note",
    contract.supportedOperatorSnapshotNote ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot transport",
    contract.supportedOperatorSnapshotTransport ?? "Unavailable",
  );
  printLine(
    "Supported operator snapshot endpoint",
    contract.supportedOperatorSnapshotEndpoint ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact version",
    String(contract.supportedShippingArtifactVersion ?? "unknown"),
  );
  printLine(
    "Supported shipping artifact kind",
    contract.supportedShippingArtifactKind ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact note",
    contract.supportedShippingArtifactNote ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact transport",
    contract.supportedShippingArtifactTransport ?? "Unavailable",
  );
  printLine(
    "Supported shipping artifact endpoint",
    contract.supportedShippingArtifactEndpoint ?? "Unavailable",
  );
  printLine("Supported zk v1 scope decision", contract.supportedZkV1ScopeDecision ?? "Unavailable");
  printLine("Supported zk v1 scope note", contract.supportedZkV1ScopeNote ?? "Unavailable");
  printLine(
    "Supported zk v1 required lanes",
    contract.supportedZkV1RequiredLanes ?? "Unavailable",
  );
  printLine(
    "Supported zk v1 required lanes note",
    contract.supportedZkV1RequiredLanesNote ?? "Unavailable",
  );
  printLine("Supported asset", contract.supportedAssetSymbol ?? "Unavailable");
  printLine("Supported environment", contract.supportedEnvironment ?? "Unavailable");
  printLine(
    "Supported note schema",
    contract.supportedNoteSchema === "note-v0"
      ? `NoteV0 / v${String(contract.supportedNoteVersion ?? 0)}`
      : "Unavailable",
  );
  printLine(
    "Supported root provenance",
    contract.supportedRootRegistrationProvenance ===
      "shield-input|send-recipient-output|send-change-output|swap-output"
      ? "Shield input / send recipient output / send change output / swap output"
      : "Unavailable",
  );
  printLine(
    "Supported send root basis",
    contract.supportedSendResultingRootBasis === "client-declared"
      ? "Client-declared"
      : "Unavailable",
  );
  printLine(
    "Supported send input-root policy",
    contract.supportedSendInputRootPolicy ===
      "latest-registered-root-with-linked-registration-proof"
      ? "Latest registered root with linked registration proof"
      : "Unavailable",
  );
  printLine(
    "Supported send output registration",
    contract.supportedSendOutputRegistrationPolicy ===
      "resulting-root-must-register-as-recipient-or-change-output"
      ? "Resulting root must register as recipient or change output"
      : "Unavailable",
  );
  printLine("Supported recipient model", contract.supportedRecipientModel ?? "Unavailable");
  printLine(
    "Supported release destination model",
    contract.supportedReleaseDestinationModel ?? "Unavailable",
  );
  printLine(
    "Supported proof system",
    contract.supportedProofSystem === "noir-acir-ultrahonk-bbjs"
      ? "Noir ACIR / UltraHonk / bb.js"
      : "Unavailable",
  );
  printLine(
    "Supported unshield circuit",
    contract.supportedUnshieldCircuit
      ? `${contract.supportedUnshieldCircuit} @ depth ${String(contract.supportedUnshieldMerkleDepth ?? "?")}`
      : "Unavailable",
  );
  printLine(
    "Supported send circuit",
    contract.supportedSendCircuit
      ? `${contract.supportedSendCircuit} @ depth ${String(contract.supportedSendMerkleDepth ?? "?")}`
      : "Unavailable",
  );
  printLine(
    "Supported release authorization",
    contract.supportedReleaseAuthorizationBasis ?? "Unavailable",
  );
  printLine("Supported release root policy", contract.supportedReleaseRootPolicy ?? "Unavailable");
  printLine(
    "Supported release execution",
    contract.supportedReleaseExecutionModel ?? "Unavailable",
  );
  printLine(
    "Supported release atomicity",
    contract.supportedReleaseAtomicityModel ?? "Unavailable",
  );
  printLine(
    "Supported release persistence",
    contract.supportedReleasePersistenceModel ?? "Unavailable",
  );
  printLine("Owner authorization mode", contract.ownerAuthorizationMode ?? "Unavailable");
  printLine(
    "Owner authorization decision",
    contract.ownerAuthorizationDecision ?? "Unavailable",
  );
  printLine(
    "Owner authorization decision note",
    contract.ownerAuthorizationDecisionNote ?? "Unavailable",
  );
  printLine("Source artifact truth", contract.sourceArtifactTruthBasis ?? "Unavailable");
  printLine("Proving artifact truth", contract.provingArtifactTruthBasis ?? "Unavailable");
  printLine("Source/proving relationship", contract.sourceProvingRelationship ?? "Unavailable");
  printLine("Nullifier key mode", contract.nullifierKeyMode ?? "Unavailable");
  printLine("Nullifier key decision", contract.nullifierKeyDecision ?? "Unavailable");
  printLine(
    "Nullifier key decision note",
    contract.nullifierKeyDecisionNote ?? "Unavailable",
  );
  printLine("Proving hash lane", contract.provingHashLane ?? "Unavailable");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`private-core operator contract: FAIL\n${message}`);
  process.exitCode = 1;
}

function buildContractSurface(contract) {
  return {
    operator: baseUrl,
    ...contract,
  };
}

function resolveBaseUrl(args) {
  const cliValue = readFlagValue(args, "--base-url");
  const envValue = process.env.VANTA_PRIVATE_CORE_OPERATOR_BASE_URL;
  const raw =
    (typeof cliValue === "string" && cliValue.trim()) ||
    (typeof envValue === "string" && envValue.trim()) ||
    "http://127.0.0.1:8789";

  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function readFlagValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
}

async function requestJson(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed for ${path}`);
  }

  return response.json();
}

function printLine(label, value) {
  console.log(`${label}: ${value}`);
}
