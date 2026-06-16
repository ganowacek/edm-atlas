import { useCallback, useEffect, useState } from 'react';
import type { ArtistNode, Genre, TrackNode } from '../types';

export type HistoryEntry =
  | { type: 'genre'; data: Genre; ts: number }
  | { type: 'artist'; data: ArtistNode; ts: number }
  | { type: 'track'; data: TrackNode; ts: number };

const STORAGE_KEY = 'edm-atlas-history';
const MAX_ITEMS = 12;

function historyKey(entry: Pick<HistoryEntry, 'type' | 'data'>): string {
  return `${entry.type}:${entry.data.id}`;
}

function readStored(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useExplorationHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(readStored);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const record = useCallback((entry: Pick<HistoryEntry, 'type' | 'data'>) => {
    setHistory((prev) => {
      const next = { ...entry, ts: Date.now() } as HistoryEntry;
      const filtered = prev.filter((h) => historyKey(h) !== historyKey(next));
      return [next, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const clear = useCallback(() => setHistory([]), []);

  return { history, record, clear };
}
