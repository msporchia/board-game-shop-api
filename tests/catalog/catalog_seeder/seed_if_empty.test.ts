import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CatalogSeeder } from '../../../src/catalog/catalog_seeder.js';
import { CatalogStore } from '../../../src/catalog/catalog_store.js';
import { Database } from '../../../src/core/database.js';
import { product } from '../../support/products.js';

const FIXTURE = 'tests/support/catalog_seed.fixture.json';

describe('CatalogSeeder.seedIfEmpty', () => {
  let db: Database;
  let store: CatalogStore;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new CatalogStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it('seeds an empty store, translating the legacy names into the domain model', () => {
    const result = new CatalogSeeder(store, FIXTURE).seedIfEmpty();

    expect(result).toEqual({ seeded: 3 });
    expect(store.count()).toBe(3);
    expect(store.getById(1)).toEqual(product());
    expect(store.getById(5)).toMatchObject({ name: 'Azul', brand: 'Plan B Games', rating: 7.8 });
  });

  it('prices every product with the deterministic demo rule', () => {
    new CatalogSeeder(store, FIXTURE).seedIfEmpty();

    // priceCents = 1500 + complexityLevel × 700 + durationMin × 10
    expect(store.getById(1)?.priceCents).toBe(1500 + 2 * 700 + 75 * 10); // Catan: 36.50 €
    expect(store.getById(2)?.priceCents).toBe(1500 + 1 * 700 + 35 * 10); // Carcassonne: 25.50 €
    expect(store.getById(5)?.priceCents).toBe(1500 + 1 * 700 + 40 * 10); // Azul: 26.00 €
  });

  it('is a no-op when the store already has rows', () => {
    store.insertMany([product({ id: 99 })]);

    const result = new CatalogSeeder(store, FIXTURE).seedIfEmpty();

    expect(result).toEqual({ seeded: 0 });
    expect(store.count()).toBe(1);
  });

  it('throws on a snapshot that fails parsing, leaving the store empty', () => {
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
