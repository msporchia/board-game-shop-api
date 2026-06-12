import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CatalogStore } from '../../../src/catalog/catalog_store.js';
import { Database } from '../../../src/core/database.js';
import { product } from '../../support/products.js';

describe('CatalogStore.listPage', () => {
  let db: Database;
  let store: CatalogStore;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new CatalogStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it('pages through products ordered by id and reports hasNext', () => {
    store.insertMany([
      product({ id: 5, name: 'Azul' }),
      product({ id: 1, name: 'Catan' }),
      product({ id: 2, name: 'Carcassonne' }),
    ]);

    const first = store.listPage(1, 2);
    expect(first.products.map((p) => p.id)).toEqual([1, 2]);
    expect(first).toMatchObject({ page: 1, pageSize: 2, hasNext: true });

    const last = store.listPage(2, 2);
    expect(last.products.map((p) => p.name)).toEqual(['Azul']);
    expect(last.hasNext).toBe(false);
  });

  it('round-trips the full product shape, arrays included', () => {
    const catan = product();
    store.insertMany([catan]);

    expect(store.listPage(1, 24).products).toEqual([catan]);
  });

  it('returns an empty page beyond the data', () => {
    store.insertMany([product()]);

    expect(store.listPage(2, 24)).toEqual({ products: [], page: 2, pageSize: 24, hasNext: false });
  });
});
