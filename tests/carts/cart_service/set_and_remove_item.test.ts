import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CatalogStore } from '../../../src/catalog/catalog_store.js';
import { CartService } from '../../../src/carts/cart_service.js';
import { CartStore } from '../../../src/carts/cart_store.js';
import { Database } from '../../../src/core/database.js';
import { product } from '../../support/products.js';

describe('CartService.setItem / removeItem', () => {
  let db: Database;
  let service: CartService;

  beforeEach(() => {
    db = new Database(':memory:');
    const catalog = new CatalogStore(db);
    catalog.insertMany([product({ id: 1, priceCents: 3650 })]);
    service = new CartService(new CartStore(db), catalog);
  });

  afterEach(() => {
    db.close();
  });

  it('setItem upserts the line and returns the recomputed cart', () => {
    service.setItem('alice', 1, 2);
    const cart = service.setItem('alice', 1, 3);

    expect(cart).toMatchObject({ totalCents: 3 * 3650 });
    expect(cart?.items).toEqual([expect.objectContaining({ productId: 1, quantity: 3 })]);
  });

  it('setItem returns null for a product not in the catalog', () => {
    expect(service.setItem('alice', 999, 1)).toBeNull();
    expect(service.getCart('alice').items).toEqual([]);
  });

  it('removeItem deletes the line and is idempotent', () => {
    service.setItem('alice', 1, 2);

    const afterRemove = service.removeItem('alice', 1);
    expect(afterRemove).toEqual({ customerId: 'alice', items: [], totalCents: 0 });

    expect(service.removeItem('alice', 1)).toEqual(afterRemove);
  });
});
