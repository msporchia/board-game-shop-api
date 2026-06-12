import type { FetchFn } from '../../src/core/fetch_fn.js';

type UpstreamHandler = (url: URL) => Response | Promise<Response>;

/**
 * Builds a `fetch` double from a plain handler. The network is the only thing
 * tests fake — clients, service, routes and app wiring all run for real.
 */
export function fakeFetch(handler: UpstreamHandler): FetchFn {
  return async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    return handler(url);
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * A fetch double routing by hostname to the two upstreams of the default
 * Config (`mock-prestashop`, `seller-api`). An omitted upstream behaves as
 * down: the request rejects like a refused connection.
 */
export function fakeUpstreams(handlers: {
  catalog?: UpstreamHandler;
  seller?: UpstreamHandler;
}): FetchFn {
  return fakeFetch((url) => {
    const handler = { 'mock-prestashop': handlers.catalog, 'seller-api': handlers.seller }[
      url.hostname
    ];
    if (!handler) {
      throw new Error(`connection refused: ${url.href}`);
    }
    return handler(url);
  });
}
