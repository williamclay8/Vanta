export type PeerOnrampAvailability =
  | "disabled"
  | "beta_blocked"
  | "unsupported_surface"
  | "needs_wallet"
  | "available";

export type PeerOnrampLaunchState =
  | "idle"
  | "install_required"
  | "connection_required"
  | "launching"
  | "opened"
  | "fulfilled"
  | "error";

export type PeerOnrampLaunchParams = {
  recipientAddress: string;
};

export type PeerOnrampLaunchResult = Extract<
  PeerOnrampLaunchState,
  "install_required" | "connection_required" | "opened"
>;

export type PeerOnrampFulfillment = {
  intentHash: `0x${string}`;
  bridgeStatus: "not_required" | "pending";
  trackingUrl: string | null;
};
