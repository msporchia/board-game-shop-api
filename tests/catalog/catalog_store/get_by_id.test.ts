import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CatalogStore } from '../../../src/catalog/catalog_store.js';
import { Database } from '../../../src/core/database.js';
import { product } from '../../support/products.js';

describe('CatalogStore.getById', () => {
  let db: Database;
  let store: CatalogStore;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new CatalogStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it('returns the stored product', () => {
    const azul = product({ id: 5, name: 'Azul', isExpansion: true, priceCents: 2600 });
    store.insertMany([product(), azul]);

    expect(store.getById(5)).toEqual(azul);
  });

  it('returns null for an unknown id', () => {
    store.insertMany([product()]);

    expect(store.getById(42)).toBeNull();
  });
});
