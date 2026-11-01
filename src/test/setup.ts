import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined') {

// No network in UI tests: every /api call fails like a device without a SAJA server,
// so the app runs in its offline demo mode unless a test installs its own fetch.
globalThis.fetch = (() => Promise.reject(new TypeError('network disabled in tests'))) as typeof fetch;

// jsdom lacks matchMedia; components read prefers-reduced-motion through it.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
if (!('ResizeObserver' in window)) {
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
if (!('IntersectionObserver' in window)) {
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    constructor(private cb: (e: { isIntersecting: boolean; target: Element }[]) => void) {}
    observe(el: Element) {
      this.cb([{ isIntersecting: true, target: el }]);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

}
