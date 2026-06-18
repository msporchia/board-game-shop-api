/**
 * Raised by BFF services when an upstream call (the AI seller) fails or returns
 * something this service cannot trust. Carries the browser-facing body so the
 * central error handler can emit a consistent `502` without re-deriving it; the
 * internal detail travels in `cause` for the logs only.
 */
export class UpstreamError extends Error {
  readonly statusCode = 502;
  readonly publicError: string;
  readonly publicMessage: string;

  constructor(publicMessage: string, options: { publicError?: string; cause?: unknown } = {}) {
    super(publicMessage, { cause: options.cause });
    this.name = 'UpstreamError';
    this.publicError = options.publicError ?? 'seller_unavailable';
    this.publicMessage = publicMessage;
  }
}
