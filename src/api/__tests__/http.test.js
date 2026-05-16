let apiFetch;

describe('apiFetch', () => {
  beforeEach(async () => {
    jest.resetModules();
    process.env.VITE_API_ORIGIN = 'https://api.example.com';
    process.env.VITE_API_USE_QUERY_TOKEN_FALLBACK = '';
    const mod = await import('../http');
    apiFetch = mod.apiFetch;
    global.fetch = jest.fn();
  });

  it('sends credentials by default', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: () => Promise.resolve('{}'),
    });
    const res = await apiFetch('/ping');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/ping',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(res.ok).toBe(true);
  });

  it('normalizes error with requestId', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      headers: { get: (k) => (k === 'x-request-id' ? 'req-1' : null) },
      text: () => Promise.resolve(JSON.stringify({ error: { code: 'bad', message: 'nope' } })),
    });
    const res = await apiFetch('/bad');
    expect(res.ok).toBe(false);
    expect(res.requestId).toBe('req-1');
    expect(res.error.code).toBe('bad');
  });
});
