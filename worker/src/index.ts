export type ProxyEnv = {
  TMDB_TOKEN: string;
  RATE_LIMITER?: RateLimit;
};

const TMDB_BASE = 'https://api.themoviedb.org';
const SEARCH_TTL_SECONDS = 60 * 60;
const DETAILS_TTL_SECONDS = 3 * 60 * 60;

type Route = { path: string; params: Record<string, string>; ttl: number };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept',
};

function json(body: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extra },
  });
}

export function matchRoute(url: URL): Route | null {
  const path = url.pathname;
  if (path === '/3/search/tv') {
    const query = url.searchParams.get('query')?.trim();
    if (!query || query.length > 100) return null;
    const page = url.searchParams.get('page');
    const params: Record<string, string> = { query, include_adult: 'false' };
    if (page && /^\d{1,2}$/.test(page)) params.page = page;
    return { path, params, ttl: SEARCH_TTL_SECONDS };
  }
  if (/^\/3\/tv\/\d{1,9}$/.test(path) || /^\/3\/tv\/\d{1,9}\/season\/\d{1,4}$/.test(path)) {
    return { path, params: {}, ttl: DETAILS_TTL_SECONDS };
  }
  return null;
}

function routeUrl(base: string, route: Route): string {
  const query = new URLSearchParams(route.params).toString();
  return `${base}${route.path}${query ? `?${query}` : ''}`;
}

export default {
  async fetch(request: Request, env: ProxyEnv, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

    const route = matchRoute(new URL(request.url));
    if (!route) return json({ error: 'Not found' }, 404);

    if (env.RATE_LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) return json({ error: 'Too many requests' }, 429, { 'Retry-After': '60' });
    }

    const cache = await caches.open('tmdb-proxy');
    const cacheKey = new Request(routeUrl(new URL(request.url).origin, route));
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const upstream = await fetch(routeUrl(TMDB_BASE, route), {
      headers: { Authorization: `Bearer ${env.TMDB_TOKEN}`, Accept: 'application/json' },
    });
    if (!upstream.ok) {
      const status = upstream.status === 404 ? 404 : 502;
      return json({ error: status === 404 ? 'Not found' : 'Upstream error' }, status);
    }

    const response = new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${route.ttl}`,
        ...CORS_HEADERS,
      },
    });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
} satisfies ExportedHandler<ProxyEnv>;
