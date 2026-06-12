/**
 * Failure of an upstream service (mock catalog, AI service): network error,
 * unexpected status, or a payload that fails zod parsing. The app-level error
 * handler maps it to a 502 response.
 */
export class UpstreamError extends Error {
  constructor(
    readonly upstream: string,
    detail: string,
    readonly status?: number,
  ) {
    super(`[${upstream}] ${detail}`);
    this.name = 'UpstreamError';
  }
}
