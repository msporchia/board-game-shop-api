import type { CartService } from '../carts/cart_service.js';
import type { CartStore } from '../carts/cart_store.js';
import type { Database } from '../core/database.js';
import type { Order } from './order.js';
import type { OrderStore } from './order_store.js';

/**
 * Order use-cases behind the /orders routes. Checkout is the one cross-domain
 * write of the service: it snapshots the priced cart into an order and clears
 * the cart, atomically — both or neither. `now` is injectable so tests control
 * timestamps.
 */
export class OrderService {
  constructor(
    private readonly db: Database,
    private readonly cartService: CartService,
    private readonly cartStore: CartStore,
    private readonly orders: OrderStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Returns null when the cart is empty — there is nothing to order. */
  checkout(customerId: string): Order | null {
    const cart = this.cartService.getCart(customerId);
    if (cart.items.length === 0) {
      return null;
    }
    return this.db.transaction(() => {
      const order = this.orders.insert({
        customerId,
        createdAt: this.now().toISOString(),
        totalCents: cart.totalCents,
        items: cart.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity,
          lineTotalCents: item.lineTotalCents,
        })),
      });
      this.cartStore.clear(customerId);
      return order;
    });
  }

  history(customerId: string): Order[] {
    return this.orders.listFor(customerId);
  }
}
