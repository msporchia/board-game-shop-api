import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CatalogSeeder } from '../../../src/catalog/catalog_seeder.js';
import { CatalogStore } from '../../../src/catalog/catalog_store.js';
import { product } from '../../support/products.js';

const FIXTURE = 'tests/support/catalog_seed.fixture.json';

describe('CatalogSeeder.seedIfEmpty', () => {
  let store: CatalogStore;

  afterEach(() => {
    store.close();
  });

  it('seeds an empty store, translating the legacy names into the domain model', () => {
    store = new CatalogStore(':memory:');

    const result = new CatalogSeeder(store, FIXTURE).seedIfEmpty();

    expect(result).toEqual({ seeded: 3 });
    expect(store.count()).toBe(3);
    expect(store.getById(1)).toEqual(product());
    expect(store.getById(5)).toMatchObject({ name: 'Azul', brand: 'Plan B Games', rating: 7.8 });
  });

  it('is a no-op when the store already has rows', () => {
    store = new CatalogStore(':memory:');
    store.insertMany([product({ id: 99 })]);

    const result = new CatalogSeeder(store, FIXTURE).seedIfEmpty();

    expect(result).toEqual({ seeded: 0 });
    expect(store.count()).toBe(1);
  });

  it('throws on a snapshot that fails parsing, leaving the store empty', () => {
    store = new CatalogStore(':memory:');
    const dir = mkdtempSync(join(tmpdir(), 'seed-test-'));
    const badPath = join(dir, 'bad.json');
    writeFileSync(badPath, JSON.stringify([{ id_product: 'not-a-number' }]));

    try {
      expect(() => new CatalogSeeder(store, badPath).seedIfEmpty()).toThrow();
      expect(store.count()).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
