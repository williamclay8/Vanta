import { peerExtensionSdk } from "@zkp2p/sdk";

import type {
  PeerOnrampFulfillment,
  PeerOnrampLaunchParams,
  PeerOnrampLaunchResult,
} from "./peerOnrampTypes";

const PEER_SOLANA_NATIVE_TOKEN = "792703809:11111111111111111111111111111111";
let activeFulfillmentUnsubscribe: (() => void) | null = null;

export function clearPeerIntentFulfilledListener() {
  if (!activeFulfillmentUnsubscribe) {
    return;
  }

  const unsubscribe = activeFulfillmentUnsubscribe;
  activeFulfillmentUnsubscribe = null;
  unsubscribe();
}

export async function getPeerExtensionState() {
  return peerExtensionSdk.getState();
}

export function openPeerInstallFlow() {
  peerExtensionSdk.openInstallPage();
}

export async function requestPeerConnection() {
  return peerExtensionSdk.requestConnection();
}

export function registerPeerIntentFulfilled(
  onFulfilled: (result: PeerOnrampFulfillment) => void,
) {
  clearPeerIntentFulfilledListener();

  const unsubscribe = peerExtensionSdk.onIntentFulfilled((result) => {
    clearPeerIntentFulfilledListener();
    onFulfilled({
      bridgeStatus: result.bridge.status,
      intentHash: result.intentHash,
      trackingUrl: result.bridge.trackingUrl ?? null,
    });
  });

  activeFulfillmentUnsubscribe = unsubscribe;

  return () => {
    if (activeFulfillmentUnsubscribe === unsubscribe) {
      activeFulfillmentUnsubscribe = null;
    }

    unsubscribe();
  };
}

export async function launchPeerOnramp(
  params: PeerOnrampLaunchParams,
  onFulfilled: (result: PeerOnrampFulfillment) => void,
): Promise<PeerOnrampLaunchResult> {
  const state = await getPeerExtensionState();

  if (state === "needs_install") {
    openPeerInstallFlow();
    return "install_required";
  }

  if (state === "needs_connection") {
    const approved = await requestPeerConnection();

    if (!approved) {
      return "connection_required";
    }
  }

  const unsubscribe = registerPeerIntentFulfilled((result) => {
    onFulfilled(result);
  });

  try {
    peerExtensionSdk.onramp({
      recipientAddress: params.recipientAddress,
      referrer: "Vanta",
      toToken: PEER_SOLANA_NATIVE_TOKEN,
    });
  } catch (error) {
    unsubscribe();
    throw error;
  }

  return "opened";
}
