import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Initialize i18n for tests — loads all locale files so t() calls return English strings
import '../i18n';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
