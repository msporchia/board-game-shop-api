import type { CatalogStore } from '../catalog/catalog_store.js';
import type { Cart, CartItem } from './cart.js';
import type { CartStore } from './cart_store.js';

/**
 * Cart use-cases behind the /carts routes: composes the stored raw lines with
 * catalog data (name, image, current price) and computes line and cart totals
 * server-side. A line whose product has left the catalog is dropped at read
 * time — the cart self-heals instead of failing.
 */
export class CartService {
  constructor(
    private readonly carts: CartStore,
    private readonly catalog: CatalogStore,
  ) {}

  getCart(customerId: string): Cart {
    const items: CartItem[] = [];
    for (const line of this.carts.linesFor(customerId)) {
      const product = this.catalog.getById(line.productId);
      if (!product) {
        continue;
      }
      items.push({
        productId: product.id,
        name: product.name,
        image: product.image,
        unitPriceCents: product.priceCents,
        quantity: line.quantity,
        lineTotalCents: product.priceCents * line.quantity,
      });
    }
    return {
      customerId,
      items,
      totalCents: items.reduce((sum, item) => sum + item.lineTotalCents, 0),
    };
  }

  /** Upserts a line. Returns null when the product is not in the catalog. */
  setItem(customerId: string, productId: number, quantity: number): Cart | null {
    if (!this.catalog.getById(productId)) {
      return null;
    }
    this.carts.upsertLine(customerId, productId, quantity);
    return this.getCart(customerId);
  }

  /** Idempotent: removing an absent line just returns the cart. */
  removeItem(customerId: string, productId: number): Cart {
    this.carts.removeLine(customerId, productId);
    return this.getCart(customerId);
  }
}
