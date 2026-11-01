/**
 * lazy() that can be preloaded, and that renders without suspending once loaded.
 * Used for the world ↔ mission loop so moving between them never flashes a loader.
 */
import { createElement, lazy, useState, type ComponentType } from 'react';

export function lazyWithPreload<P extends object>(factory: () => Promise<{ default: ComponentType<P> }>) {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<{ default: ComponentType<P> }> | null = null;
  const load = () =>
    (pending ??= factory().then((m) => {
      loaded = m.default;
      return m;
    }));
  const Lazy = lazy(load);
  function Preloadable(props: P) {
    // The component type is fixed per mount, so a later load never remounts a live screen.
    const [Comp] = useState<ComponentType<P>>(() => loaded ?? Lazy);
    return createElement(Comp, props);
  }
  Preloadable.preload = () => {
    load().catch(() => (pending = null)); // a failed preload is retried on real navigation
  };
  return Preloadable;
}

/** Runs `fn` when the browser is idle (or soon, where idle callbacks don't exist). */
export function whenIdle(fn: () => void) {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 4000 });
  else window.setTimeout(fn, 2000);
}
