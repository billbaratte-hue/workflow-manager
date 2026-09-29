/**
 * Setup file for Vitest test suites.
 */
import { vi } from 'vitest';

// Mock window.matchMedia if needed
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Global default mock for fetch to prevent network hangs in component unit tests
if (typeof window !== 'undefined') {
  const defaultFetch = vi.fn().mockImplementation((url: string) => {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve(''),
    });
  });
  if (!window.fetch || (window.fetch as any).name !== 'mockConstructor') {
    window.fetch = defaultFetch as any;
  }
}

