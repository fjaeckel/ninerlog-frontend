import { useEffect } from 'react';
import { useSaveWarningsStore, type SaveWarningEntry } from '../../stores/saveWarningsStore';

/** Pending save warnings rendered inline by a notice; the global toast yields while it is mounted. */
export function useInlineSaveWarnings(): SaveWarningEntry[] {
  const entries = useSaveWarningsStore((s) => s.entries);
  const addHost = useSaveWarningsStore((s) => s.addHost);
  const removeHost = useSaveWarningsStore((s) => s.removeHost);
  useEffect(() => {
    addHost();
    return removeHost;
  }, [addHost, removeHost]);
  return entries;
}
