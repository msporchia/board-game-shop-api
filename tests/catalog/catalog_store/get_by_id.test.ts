import { afterEach, describe, expect, it } from 'vitest';
import { CatalogStore } from '../../../src/catalog/catalog_store.js';
import { product } from '../../support/products.js';

describe('CatalogStore.getById', () => {
  let store: CatalogStore;

  afterEach(() => {
    store.close();
  });

  it('returns the stored product', () => {
    store = new CatalogStore(':memory:');
    const azul = product({ id: 5, name: 'Azul', isExpansion: true });
    store.insertMany([product(), azul]);

    expect(store.getById(5)).toEqual(azul);
  });

  it('returns null for an unknown id', () => {
    store = new CatalogStore(':memory:');
    store.insertMany([product()]);

    expect(store.getById(42)).toBeNull();
  });
});
