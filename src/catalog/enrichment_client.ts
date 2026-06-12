import { z } from 'zod';
import type { FetchFn } from '../core/fetch_fn.js';
import { UpstreamError } from '../core/upstream_error.js';
import type { Enrichment } from './product.js';

const UPSTREAM = 'seller-api';

const upstreamDetailSchema = z.object({
  description: z.string(),
  citations: z.array(z.object({ source: z.string(), url: z.string().optional() })).default([]),
});

/**
 * HTTP client for the AI service's enriched-detail endpoint:
 * `GET /detail/{id_product}` → description + citations, 404 when the product
 * has no enrichment. The contract is agreed but not implemented seller-side
 * yet (see docs/phase-1.md) — callers must treat failures as absence.
 */
export class EnrichmentClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: FetchFn = globalThis.fetch,
  ) {}

  async getEnrichment(productId: number): Promise<Enrichment | null> {
    const url = new URL(`/detail/${productId}`, this.baseUrl);

    let response: Response;
    try {
      response = await this.fetchFn(url);
    } catch (err) {
      throw new UpstreamError(UPSTREAM, `request failed: ${String(err)}`);
    }
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new UpstreamError(UPSTREAM, `unexpected status ${response.status}`, response.status);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (err) {
      throw new UpstreamError(UPSTREAM, `invalid JSON body: ${String(err)}`);
    }
    const parsed = upstreamDetailSchema.safeParse(body);
    if (!parsed.success) {
      throw new UpstreamError(UPSTREAM, `payload failed parsing: ${parsed.error.message}`);
    }

    return { description: parsed.data.description, citations: parsed.data.citations };
  }
}
