import { AnyProblemData } from '../types/problem';

const HISTORY_KEY = 'pex_history';
const MAX_ENTRIES = 50;

export interface HistoryEntry {
  id: string;
  type: string;
  title: string;
  timestamp: number;
  data: AnyProblemData;
}

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function addToHistory(data: AnyProblemData): void {
  const entries = getHistory();
  const entry: HistoryEntry = {
    id: `hist-${Date.now()}`,
    type: data.type,
    title: data.title || '未命名',
    timestamp: Date.now(),
    data,
  };
  const deduplicated = entries.filter(e => !(e.type === data.type && e.title === data.title));
  const updated = [entry, ...deduplicated].slice(0, MAX_ENTRIES);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function removeFromHistory(id: string): void {
  const entries = getHistory().filter(e => e.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
