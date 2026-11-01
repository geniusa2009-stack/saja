/** A tiny fake SAJA server for UI tests: route → [status, body], and a log of calls. */
export function fakeServer(routes: Record<string, (init: RequestInit & { url: string }) => [number, unknown]>) {
  const calls: { method: string; url: string; body: unknown }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, url, body });
    const path = url.replace(/^\/api/, '');
    const key = Object.keys(routes).find((k) => {
      const [m, p] = k.includes(' ') ? k.split(' ') : ['GET', k];
      return m === method && (p === path || (p.endsWith('*') && path.startsWith(p.slice(0, -1))));
    });
    if (!key) return new Response(JSON.stringify({ error: { code: 'not_found', message: 'x' } }), { status: 404 });
    const [status, res] = routes[key]({ ...init, url });
    return new Response(JSON.stringify(res), { status });
  }) as typeof fetch;
  return calls;
}

export const offlineFetch = () => {
  globalThis.fetch = (() => Promise.reject(new TypeError('network disabled in tests'))) as typeof fetch;
};
