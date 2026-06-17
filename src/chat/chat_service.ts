import type { CatalogStore } from '../catalog/catalog_store.js';
import type { OrderService } from '../orders/order_service.js';
import { type ChatRequest, type ChatResponse, sellerChatResponseSchema } from './chat.js';

export class ChatUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatUpstreamError';
  }
}

type Fetcher = typeof fetch;
const RECENT_ORDER_LIMIT = 5;

/**
 * Browser-facing chat adapter. The browser calls the shop BFF only; this service
 * forwards to the AI seller, validates the response, and enriches returned game ids
 * with shop-owned catalog/price data so the web can render buyable cards.
 */
export class ChatService {
  constructor(
    private readonly sellerApiUrl: string,
    private readonly catalog: CatalogStore,
    private readonly orders: OrderService,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  async reply(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.fetcher(`${this.sellerApiUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: request.sessionId,
        message: request.message,
        choices: request.choices,
        k: request.k,
        customer_context: this.customerContextFor(request.customerId),
      }),
    });

    if (!response.ok) {
      throw new ChatUpstreamError(`seller chat failed with ${response.status}`);
    }

    let sellerPayload: unknown;
    try {
      sellerPayload = await response.json();
    } catch {
      throw new ChatUpstreamError('seller chat returned invalid json');
    }

    const sellerReply = sellerChatResponseSchema.safeParse(sellerPayload);
    if (!sellerReply.success) {
      throw new ChatUpstreamError('seller chat returned an invalid payload');
    }

    const sellerData = sellerReply.data;
    const games = sellerData.games
      .map((game) => this.catalog.getById(game.id))
      .filter((product) => product !== null)
      .map((product) => ({
        id: product.id,
        name: product.name,
        image: product.image,
        priceCents: product.priceCents,
        playersDisplay: product.playersDisplay,
        durationMin: product.durationMin,
        complexity: product.complexity,
      }));

    return {
      message: sellerData.message,
      games,
      quickReplies: sellerData.quick_replies,
    };
  }

  private customerContextFor(customerId: string): {
    owned_product_ids: number[];
    recent_orders: Array<{
      id: number;
      created_at: string;
      items: Array<{ product_id: number; name: string; quantity: number }>;
    }>;
  } {
    const history = this.orders.history(customerId);
    const ownedProductIds = new Set<number>();
    for (const order of history) {
      for (const item of order.items) {
        ownedProductIds.add(item.productId);
      }
    }

    return {
      owned_product_ids: [...ownedProductIds].sort((a, b) => a - b),
      recent_orders: history.slice(0, RECENT_ORDER_LIMIT).map((order) => ({
        id: order.id,
        created_at: order.createdAt,
        items: order.items.map((item) => ({
          product_id: item.productId,
          name: item.name,
          quantity: item.quantity,
        })),
      })),
    };
  }
}
