/// <reference types="vite/client" />

// @ts-ignore
const _importMeta = import.meta;
const INDEXER_URL = (_importMeta?.env?.VITE_INDEXER_URL) || 'https://vanta-light-public-indexer.onrender.com';
const OPERATOR_URL = (_importMeta?.env?.VITE_OPERATOR_URL) || '';

export interface RootData {
  merkleRoot: string;
  nullifierRoot: string;
  timestamp: number;
}

function isValidRootData(data: any): data is RootData {
  return (
    data &&
    typeof data.merkleRoot === 'string' &&
    typeof data.nullifierRoot === 'string' &&
    typeof data.timestamp === 'number'
  );
}

export async function fetchIndexerRoot(): Promise<RootData | null> {
  try {
    const res = await fetch(`${INDEXER_URL}/root`);
    if (!res.ok) {
      console.warn(`[Indexer] Indexer responded with status ${res.status}`);
      return null;
    }
    const data = await res.json();

    if (!isValidRootData(data)) {
      console.warn('[Indexer] Invalid root data received from indexer');
      return null;
    }

    console.log('[Indexer] Fetched valid root from indexer');
    return data;
  } catch (err: any) {
    console.warn('[Indexer] Failed to fetch from indexer:', err.message);
    return null;
  }
}

export async function fetchOperatorRoot(): Promise<RootData | null> {
  if (!OPERATOR_URL) return null;

  try {
    const res = await fetch(`${OPERATOR_URL}/root`);
    if (!res.ok) {
      console.warn(`[Indexer] Operator responded with status ${res.status}`);
      return null;
    }
    const data = await res.json();

    if (!isValidRootData(data)) {
      console.warn('[Indexer] Invalid root data received from operator');
      return null;
    }

    console.log('[Indexer] Fetched valid root from operator');
    return data;
  } catch (err: any) {
    console.error('[Indexer] Failed to fetch from operator:', err.message);
    return null;
  }
}

export async function getCurrentRoot(useIndexer: boolean = true): Promise<RootData | null> {
  if (useIndexer) {
    const indexerRoot = await fetchIndexerRoot();
    if (indexerRoot) return indexerRoot;
  }
  return await fetchOperatorRoot();
}

// Client-side proving (Noir WASM)
import { Noir } from '@noir-lang/noir_js';

const SHIELD_CIRCUIT = { /* compiled circuit JSON */ } as any;

export interface ShieldProofInputs {
  assetId: string;
  amount: bigint;
  ownerPublicKey: string;
  noteSecret: string;
  blinding: string;
}

export interface ShieldProofArtifact {
  proof: Uint8Array;
  publicInputs: Uint8Array[];
  nullifier: string;
  commitment: string;
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export async function generateShieldProof(
  inputs: ShieldProofInputs
): Promise<ShieldProofArtifact> {
  const root = await getCurrentRoot(true);
  if (!root) throw new Error('Failed to get current root');

  const witness = {
    asset_id: inputs.assetId,
    amount: inputs.amount.toString(),
    owner_public_key: inputs.ownerPublicKey,
    note_secret: inputs.noteSecret,
    blinding: inputs.blinding,
    merkle_root: root.merkleRoot,
  };

  const noir = new Noir(SHIELD_CIRCUIT);
  // @ts-ignore - API may vary by version
  const proofData = await noir.generateProof(witness);

  return {
    proof: new Uint8Array(proofData.proof),
    publicInputs: proofData.publicInputs.map((p: string) => hexToUint8Array(p.slice(2))),
    nullifier: proofData.publicInputs[0],
    commitment: proofData.publicInputs[1],
  };
}