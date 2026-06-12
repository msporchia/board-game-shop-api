import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Database } from '../../../src/core/database.js';
import { OrderStore } from '../../../src/orders/order_store.js';

const orderInput = (overrides: Partial<Parameters<OrderStore['insert']>[0]> = {}) => ({
  customerId: 'alice',
  createdAt: '2026-06-12T10:00:00.000Z',
  totalCents: 7300,
  items: [{ productId: 1, name: 'Catan', unitPriceCents: 3650, quantity: 2, lineTotalCents: 7300 }],
  ...overrides,
});

describe('OrderStore', () => {
  let db: Database;
  let store: OrderStore;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new OrderStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it('round-trips an order with its snapshot lines', () => {
    const inserted = store.insert(orderInput());

    expect(inserted.id).toBeGreaterThan(0);
    expect(store.listFor('alice')).toEqual([inserted]);
  });

  it('lists a customer’s orders newest first, ignoring other customers', () => {
    const first = store.insert(orderInput({ createdAt: '2026-06-10T10:00:00.000Z' }));
    const second = store.insert(orderInput({ createdAt: '2026-06-12T10:00:00.000Z' }));
    store.insert(orderInput({ customerId: 'bob' }));

    expect(store.listFor('alice').map((order) => order.id)).toEqual([second.id, first.id]);
  });

  it('returns an empty history for a never-seen customer', () => {
    expect(store.listFor('nobody')).toEqual([]);
  });
});
