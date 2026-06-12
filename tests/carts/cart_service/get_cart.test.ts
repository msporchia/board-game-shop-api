import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CatalogStore } from '../../../src/catalog/catalog_store.js';
import { CartService } from '../../../src/carts/cart_service.js';
import { CartStore } from '../../../src/carts/cart_store.js';
import { Database } from '../../../src/core/database.js';
import { product } from '../../support/products.js';

describe('CartService.getCart', () => {
  let db: Database;
  let cartStore: CartStore;
  let service: CartService;

  beforeEach(() => {
    db = new Database(':memory:');
    const catalog = new CatalogStore(db);
    catalog.insertMany([
      product({ id: 1, name: 'Catan', priceCents: 3650 }),
      product({ id: 5, name: 'Azul', priceCents: 2600 }),
    ]);
    cartStore = new CartStore(db);
    service = new CartService(cartStore, catalog);
  });

  afterEach(() => {
    db.close();
  });

  it('returns an empty cart for a never-seen customer', () => {
    expect(service.getCart('ghost')).toEqual({ customerId: 'ghost', items: [], totalCents: 0 });
  });

  it('composes lines with catalog data and computes line and cart totals', () => {
    cartStore.upsertLine('alice', 1, 2);
    cartStore.upsertLine('alice', 5, 1);

    expect(service.getCart('alice')).toEqual({
      customerId: 'alice',
      items: [
        {
          productId: 1,
          name: 'Catan',
          image: 'https://img.gamenest.example/1.jpg',
          unitPriceCents: 3650,
          quantity: 2,
          lineTotalCents: 7300,
        },
        {
          productId: 5,
          name: 'Azul',
          image: 'https://img.gamenest.example/1.jpg',
          unitPriceCents: 2600,
          quantity: 1,
          lineTotalCents: 2600,
        },
      ],
      totalCents: 9900,
    });
  });

  it('drops lines whose product has left the catalog', () => {
    cartStore.upsertLine('alice', 1, 1);
    cartStore.upsertLine('alice', 999, 1);

    const cart = service.getCart('alice');

    expect(cart.items.map((item) => item.productId)).toEqual([1]);
    expect(cart.totalCents).toBe(3650);
  });
});
