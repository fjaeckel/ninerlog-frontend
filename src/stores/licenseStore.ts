import { create } from 'zustand';
import type { License } from '../types/api';

// Re-export for backward compatibility
export type { License };

interface LicenseState {
  licenses: License[];
  activeLicense: License | null;
  defaultLicenseId: string | null;
  setLicenses: (licenses: License[]) => void;
  setActiveLicense: (license: License | null) => void;
  setDefaultLicenseId: (id: string | null) => void;
  addLicense: (license: License) => void;
  updateLicense: (id: string, updates: Partial<License>) => void;
  removeLicense: (id: string) => void;
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  licenses: [],
  activeLicense: null,
  defaultLicenseId: null,
  setLicenses: (licenses) => {
    set({ licenses });
    // Always set active license from default — default is source of truth
    const state = get();
    if (licenses.length > 0) {
      const defaultLic = state.defaultLicenseId
        ? licenses.find((l) => l.id === state.defaultLicenseId)
        : null;
      set({ activeLicense: defaultLic || licenses[0] });
    }
  },
  setActiveLicense: (license) => set({ activeLicense: license }),
  setDefaultLicenseId: (id) => {
    set({ defaultLicenseId: id });
    const state = get();
    if (id && state.licenses.length > 0) {
      const lic = state.licenses.find((l) => l.id === id);
      if (lic) set({ activeLicense: lic });
    }
  },
  addLicense: (license) => set((state) => ({ licenses: [...state.licenses, license] })),
  updateLicense: (id, updates) =>
    set((state) => ({
      licenses: state.licenses.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),
  removeLicense: (id) =>
    set((state) => ({
      licenses: state.licenses.filter((l) => l.id !== id),
      activeLicense: state.activeLicense?.id === id ? null : state.activeLicense,
    })),
}));
