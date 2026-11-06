/** A production build never shows a text whose reuse permission is pending; a review build may. */
const load = async (env: Record<string, string>) => {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import('./rights');
};
afterEach(() => vi.unstubAllEnvs());

describe('third-party text rights', () => {
  it('production build: pending texts are hidden, cleared ones shown', async () => {
    const { mayShow, TEXT_RIGHTS } = await load({ MODE: 'production', VITE_SAJA_DRAFT_CONTENT: '' });
    expect(TEXT_RIGHTS.saheehInternational).toBe('pending');
    expect(mayShow('pending')).toBe(false);
    expect(mayShow('cleared')).toBe(true);
  });

  it('a reviewer build made with VITE_SAJA_DRAFT_CONTENT=true shows pending texts', async () => {
    const { mayShow } = await load({ MODE: 'production', VITE_SAJA_DRAFT_CONTENT: 'true' });
    expect(mayShow('pending')).toBe(true);
  });
});
