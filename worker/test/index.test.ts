import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import worker, { type ProxyEnv } from '../src/index';

const upstream = vi.fn<typeof fetch>();

function env(overrides: Partial<ProxyEnv> = {}): ProxyEnv {
  return { TMDB_TOKEN: 'secret-token', RATE_LIMITER: { limit: async () => ({ success: true }) }, ...overrides };
}

async function call(path: string, init: RequestInit = {}, proxyEnv: ProxyEnv = env()) {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(`https://proxy.example${path}`, init), proxyEnv, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

function tmdbResponds(body: unknown, status = 200) {
  upstream.mockImplementation(async () => new Response(JSON.stringify(body), { status }));
}

beforeEach(() => {
  upstream.mockReset();
  vi.spyOn(globalThis, 'fetch').mockImplementation(upstream);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('allowed requests', () => {
  it('forwards a search with the token and only the parameters it allows', async () => {
    tmdbResponds({ results: [{ id: 1 }] });
    const response = await call('/3/search/tv?query=firefly&include_adult=true&api_key=stolen&page=2');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results: [{ id: 1 }] });
    const [url, init] = upstream.mock.calls[0];
    expect(url).toBe('https://api.themoviedb.org/3/search/tv?query=firefly&include_adult=false&page=2');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer secret-token');
  });

  it.each(['/3/tv/1396', '/3/tv/1396/season/5'])('forwards %s', async (path) => {
    tmdbResponds({ id: 1396 });
    const response = await call(path);
    expect(response.status).toBe(200);
    expect(upstream.mock.calls[0][0]).toBe(`https://api.themoviedb.org${path}`);
  });

  it('lets the web dev preview call it', async () => {
    tmdbResponds({ id: 2 });
    const response = await call('/3/tv/2');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect((await call('/3/tv/2', { method: 'OPTIONS' })).status).toBe(204);
  });
});

describe('blocked requests', () => {
  it.each([
    '/3/movie/550',
    '/3/account',
    '/3/tv/1396/credits',
    '/3/search/movie?query=x',
    '/3/tv/abc',
    '/',
  ])('rejects %s without calling TMDB', async (path) => {
    const response = await call(path);
    expect(response.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects an empty or overly long search', async () => {
    expect((await call('/3/search/tv?query=%20')).status).toBe(404);
    expect((await call(`/3/search/tv?query=${'a'.repeat(101)}`)).status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('only accepts GET', async () => {
    expect((await call('/3/tv/1', { method: 'POST' })).status).toBe(405);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('turns away a client over the rate limit', async () => {
    const limited = env({ RATE_LIMITER: { limit: async () => ({ success: false }) } });
    const response = await call('/3/tv/3', {}, limited);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(upstream).not.toHaveBeenCalled();
  });

  it('still works when no rate limiter is configured', async () => {
    tmdbResponds({ id: 4 });
    expect((await call('/3/tv/4', {}, env({ RATE_LIMITER: undefined }))).status).toBe(200);
  });
});

describe('caching', () => {
  it('answers a repeated request from the cache', async () => {
    tmdbResponds({ id: 10 });
    await call('/3/tv/10');
    const second = await call('/3/tv/10');
    expect(await second.json()).toEqual({ id: 10 });
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('shares one cache entry for searches that differ only in ignored parameters', async () => {
    tmdbResponds({ results: [] });
    await call('/3/search/tv?query=lost');
    await call('/3/search/tv?query=lost&include_adult=true&language=xx');
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    tmdbResponds({}, 500);
    expect((await call('/3/tv/20')).status).toBe(502);
    tmdbResponds({ id: 20 });
    expect((await call('/3/tv/20')).status).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('passes a missing show through as not found', async () => {
    tmdbResponds({}, 404);
    expect((await call('/3/tv/999999')).status).toBe(404);
  });
});
