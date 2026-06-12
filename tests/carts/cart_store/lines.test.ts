import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CartStore } from '../../../src/carts/cart_store.js';
import { Database } from '../../../src/core/database.js';

describe('CartStore', () => {
  let db: Database;
  let store: CartStore;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new CartStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it('round-trips lines per customer, ordered by product id', () => {
    store.upsertLine('alice', 5, 1);
    store.upsertLine('alice', 1, 2);
    store.upsertLine('bob', 1, 9);

    expect(store.linesFor('alice')).toEqual([
      { productId: 1, quantity: 2 },
      { productId: 5, quantity: 1 },
    ]);
    expect(store.linesFor('nobody')).toEqual([]);
  });

  it('upsert overwrites the quantity of an existing line', () => {
    store.upsertLine('alice', 1, 2);
    store.upsertLine('alice', 1, 7);

    expect(store.linesFor('alice')).toEqual([{ productId: 1, quantity: 7 }]);
  });

  it('removes a single line, leaving the rest', () => {
    store.upsertLine('alice', 1, 2);
    store.upsertLine('alice', 5, 1);

    store.removeLine('alice', 1);

    expect(store.linesFor('alice')).toEqual([{ productId: 5, quantity: 1 }]);
  });

  it('clear empties only that customer', () => {
    store.upsertLine('alice', 1, 2);
    store.upsertLine('bob', 1, 1);

    store.clear('alice');

    expect(store.linesFor('alice')).toEqual([]);
    expect(store.linesFor('bob')).toEqual([{ productId: 1, quantity: 1 }]);
  });
});
