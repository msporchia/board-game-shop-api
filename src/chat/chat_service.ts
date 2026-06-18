import type { CartService } from '../carts/cart_service.js';
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

interface SellerCustomerContext {
  received_products: number[];
  sent_products: number[];
  cart_products: number[];
}

/**
 * Browser-facing chat adapter. The browser calls the shop BFF only; this service
 * forwards to the AI seller, validates the response, and enriches returned game ids
 * with shop-owned catalog/price data so the web can render buyable cards.
 */
export class ChatService {
  constructor(
    private readonly sellerApiUrl: string,
    private readonly catalog: CatalogStore,
    private readonly carts: CartService,
    private readonly orders: OrderService,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  async reply(customerId: string, request: ChatRequest): Promise<ChatResponse> {
    const response = await this.fetcher(`${this.sellerApiUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: request.sessionId,
        message: request.message,
        choices: request.choices,
        k: request.k,
        customer_context: this.customerContextFor(customerId),
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

  private customerContextFor(customerId: string): SellerCustomerContext {
    const history = this.orders.history(customerId);
    const receivedProducts = this.uniqueProductIds(
      history.flatMap((order) => order.items.map((item) => item.productId)),
    );
    const cartProducts = this.uniqueProductIds(
      this.carts.getCart(customerId).items.map((item) => item.productId),
    );

    return {
      received_products: receivedProducts,
      sent_products: [],
      cart_products: cartProducts,
    };
  }

  private uniqueProductIds(ids: number[]): number[] {
    return [...new Set(ids)].sort((a, b) => a - b);
  }
}
