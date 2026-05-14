import {
  importVantaShieldRecipientViewingKeyExchangePacket,
  type VantaShieldRecipientViewingKeyExchangePacket,
} from "@/solana/vantaShieldViewingKey";

export const VANTA_RECIPIENT_VIEWING_KEY_EXCHANGE_STORAGE_KEY =
  "vanta.recipient-viewing-key-exchange.v1" as const;

export const VANTA_RECIPIENT_VIEWING_KEY_EXCHANGE_STATUS_COPY =
  "direct-key beta; not deployed recipient discovery" as const;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage) {
    return storage;
  }

  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage;
}

function readPacketList(storage?: StorageLike | null): VantaShieldRecipientViewingKeyExchangePacket[] {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) {
    return [];
  }

  const raw = resolvedStorage.getItem(VANTA_RECIPIENT_VIEWING_KEY_EXCHANGE_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((entry) => {
    try {
      const packet = importVantaShieldRecipientViewingKeyExchangePacket(entry);
      return packet.productionReady === false ? [packet] : [];
    } catch {
      return [];
    }
  });
}

function writePacketList(
  packets: readonly VantaShieldRecipientViewingKeyExchangePacket[],
  storage?: StorageLike | null,
) {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.setItem(
    VANTA_RECIPIENT_VIEWING_KEY_EXCHANGE_STORAGE_KEY,
    JSON.stringify(packets),
  );
}

export function listVantaRecipientViewingKeyExchangePackets(
  storage?: StorageLike | null,
): VantaShieldRecipientViewingKeyExchangePacket[] {
  return readPacketList(storage).sort((left, right) => right.createdAt - left.createdAt);
}

export function findVantaRecipientViewingKeyExchangePacket(
  recipientWalletAddress: string,
  storage?: StorageLike | null,
): VantaShieldRecipientViewingKeyExchangePacket | null {
  const normalizedRecipient = recipientWalletAddress.trim();
  return (
    listVantaRecipientViewingKeyExchangePackets(storage).find(
      (packet) =>
        packet.productionReady === false &&
        packet.recipientWalletAddress === normalizedRecipient,
    ) ?? null
  );
}

export function upsertVantaRecipientViewingKeyExchangePacket(
  packet: unknown,
  storage?: StorageLike | null,
): VantaShieldRecipientViewingKeyExchangePacket {
  const normalized = importVantaShieldRecipientViewingKeyExchangePacket(packet);
  const packets = listVantaRecipientViewingKeyExchangePackets(storage);
  const nextPackets = [
    normalized,
    ...packets.filter((stored) => stored.fingerprint !== normalized.fingerprint),
  ];
  writePacketList(nextPackets, storage);
  return normalized;
}
