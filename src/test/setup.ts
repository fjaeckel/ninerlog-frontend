import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Initialize i18n for tests — loads all locale files so t() calls return English strings
import '../i18n';

// Node.js 25+ ships a built-in globalThis.localStorage that is non-functional
// without the --localstorage-file flag. Happy-dom reuses this broken object
// instead of providing its own. Zustand's persist middleware then fails with
// "storage.setItem is not a function". Provide a working in-memory fallback.
if (typeof globalThis.localStorage?.setItem !== 'function') {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
  };
  globalThis.localStorage = storage as unknown as Storage;
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});
