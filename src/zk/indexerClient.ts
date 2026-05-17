/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INDEXER_URL?: string;
  readonly VITE_OPERATOR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

function getEnv(key: string, fallback: string): string {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key] || fallback;
    }
  } catch (_) {}

  // @ts-ignore
  if (typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    return process.env[key] || fallback;
  }

  return fallback;
}

const INDEXER_URL = getEnv('VITE_INDEXER_URL', 'https://vanta-light-public-indexer.onrender.com');
const OPERATOR_URL = getEnv('VITE_OPERATOR_URL', '');

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