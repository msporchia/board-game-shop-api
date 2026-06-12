import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CatalogStore } from '../../../src/catalog/catalog_store.js';
import { CartService } from '../../../src/carts/cart_service.js';
import { CartStore } from '../../../src/carts/cart_store.js';
import { Database } from '../../../src/core/database.js';
import { OrderService } from '../../../src/orders/order_service.js';
import { OrderStore } from '../../../src/orders/order_store.js';
import { product } from '../../support/products.js';

const FROZEN_NOW = new Date('2026-06-12T10:00:00.000Z');

describe('OrderService.checkout', () => {
  let db: Database;
  let cartService: CartService;
  let service: OrderService;

  beforeEach(() => {
    db = new Database(':memory:');
    const catalog = new CatalogStore(db);
    catalog.insertMany([
      product({ id: 1, name: 'Catan', priceCents: 3650 }),
      product({ id: 5, name: 'Azul', priceCents: 2600 }),
    ]);
    const cartStore = new CartStore(db);
    cartService = new CartService(cartStore, catalog);
    service = new OrderService(db, cartService, cartStore, new OrderStore(db), () => FROZEN_NOW);
  });

  afterEach(() => {
    db.close();
  });

  it('snapshots the cart into an order with the injected timestamp and clears the cart', () => {
    cartService.setItem('alice', 1, 2);
    cartService.setItem('alice', 5, 1);

    const order = service.checkout('alice');

    expect(order).toEqual({
      id: 1,
      customerId: 'alice',
      createdAt: '2026-06-12T10:00:00.000Z',
      totalCents: 9900,
      items: [
        { productId: 1, name: 'Catan', unitPriceCents: 3650, quantity: 2, lineTotalCents: 7300 },
        { productId: 5, name: 'Azul', unitPriceCents: 2600, quantity: 1, lineTotalCents: 2600 },
      ],
    });
    expect(cartService.getCart('alice').items).toEqual([]);
    expect(service.history('alice')).toEqual([order]);
  });

  it('returns null on an empty cart and records nothing', () => {
    expect(service.checkout('alice')).toBeNull();
    expect(service.history('alice')).toEqual([]);
  });
});
