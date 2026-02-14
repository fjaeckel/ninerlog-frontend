import { create } from 'zustand';
import type { License } from '../types/api';

// Re-export for backward compatibility
export type { License };

interface LicenseState {
  licenses: License[];
  setLicenses: (licenses: License[]) => void;
  addLicense: (license: License) => void;
  updateLicense: (id: string, updates: Partial<License>) => void;
  removeLicense: (id: string) => void;
}

export const useLicenseStore = create<LicenseState>((set) => ({
  licenses: [],
  setLicenses: (licenses) => set({ licenses }),
  addLicense: (license) => set((state) => ({ licenses: [...state.licenses, license] })),
  updateLicense: (id, updates) =>
    set((state) => ({
      licenses: state.licenses.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),
  removeLicense: (id) =>
    set((state) => ({
      licenses: state.licenses.filter((l) => l.id !== id),
    })),
}));
