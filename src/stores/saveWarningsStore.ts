import { create } from 'zustand';
import type { components } from '../api/schema';

export type SaveWarning = components['schemas']['SaveWarning'];

export interface SaveWarningEntry {
  id: string;
  warning: SaveWarning;
}

interface SaveWarningsState {
  /** Warnings of recent saves, oldest first. Not persisted. */
  entries: SaveWarningEntry[];
  /** Mounted notices that render the warnings inline; the global toast yields to them. */
  hosts: number;
  push: (warnings: readonly SaveWarning[] | null | undefined) => void;
  dismiss: (id: string) => void;
  clear: () => void;
  addHost: () => void;
  removeHost: () => void;
}

let seq = 0;
const keyOf = (w: SaveWarning) => `${w.code}:${JSON.stringify(w.params ?? {})}`;

export const useSaveWarningsStore = create<SaveWarningsState>((set) => ({
  entries: [],
  hosts: 0,
  push: (warnings) => {
    if (!warnings || warnings.length === 0) return;
    set((s) => {
      const seen = new Set(s.entries.map((e) => keyOf(e.warning)));
      const added: SaveWarningEntry[] = [];
      for (const w of warnings) {
        const k = keyOf(w);
        if (seen.has(k)) continue;
        seen.add(k);
        added.push({ id: `sw${++seq}`, warning: w });
      }
      return added.length ? { entries: [...s.entries, ...added] } : s;
    });
  },
  dismiss: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
  clear: () => set({ entries: [] }),
  addHost: () => set((s) => ({ hosts: s.hosts + 1 })),
  removeHost: () => set((s) => ({ hosts: Math.max(0, s.hosts - 1) })),
}));

/** Records the warnings of a save response. */
export const reportSaveWarnings = (warnings: readonly SaveWarning[] | null | undefined) =>
  useSaveWarningsStore.getState().push(warnings);
