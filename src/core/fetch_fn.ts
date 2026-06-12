/**
 * The `fetch` shape the HTTP clients depend on. Injected via constructor
 * (defaulting to the global) so tests can fake the network — the single I/O
 * seam — and exercise everything else for real.
 */
export type FetchFn = typeof globalThis.fetch;
