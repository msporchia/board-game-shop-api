import { DatabaseSync } from 'node:sqlite';
import type { Product, ProductPage } from './product.js';

interface ProductRow {
  id: number;
  name: string;
  description: string;
  tags: string;
  authors: string;
  players: string;
  players_display: string;
  duration_min: number;
  age_min: number;
  complexity: string;
  complexity_level: number;
  year: number;
  rating: number;
  is_expansion: number;
  category: string;
  brand: string;
  image: string;
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tags: JSON.parse(row.tags) as string[],
    authors: row.authors,
    players: JSON.parse(row.players) as number[],
    playersDisplay: row.players_display,
    durationMin: row.duration_min,
    ageMin: row.age_min,
    complexity: row.complexity,
    complexityLevel: row.complexity_level,
    year: row.year,
    rating: row.rating,
    isExpansion: row.is_expansion === 1,
    category: row.category,
    brand: row.brand,
    image: row.image,
  };
}

/**
 * SQLite-backed catalog store — the shop owns its catalog data (see
 * docs/phase-1.md). Owns the database handle and the `products` table; array
 * fields are stored as JSON text. `node:sqlite` keeps the dependency tree
 * native-free and stays swappable behind this class.
 */
export class CatalogStore {
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        tags TEXT NOT NULL,
        authors TEXT NOT NULL,
        players TEXT NOT NULL,
        players_display TEXT NOT NULL,
        duration_min REAL NOT NULL,
        age_min REAL NOT NULL,
        complexity TEXT NOT NULL,
        complexity_level INTEGER NOT NULL,
        year INTEGER NOT NULL,
        rating REAL NOT NULL,
        is_expansion INTEGER NOT NULL,
        category TEXT NOT NULL,
        brand TEXT NOT NULL,
        image TEXT NOT NULL
      )
    `);
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM products').get() as { n: number };
    return row.n;
  }

  insertMany(products: Product[]): void {
    const insert = this.db.prepare(`
      INSERT INTO products (
        id, name, description, tags, authors, players, players_display,
        duration_min, age_min, complexity, complexity_level, year, rating,
        is_expansion, category, brand, image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.db.exec('BEGIN');
    try {
      for (const product of products) {
        insert.run(
          product.id,
          product.name,
          product.description,
          JSON.stringify(product.tags),
          product.authors,
          JSON.stringify(product.players),
          product.playersDisplay,
          product.durationMin,
          product.ageMin,
          product.complexity,
          product.complexityLevel,
          product.year,
          product.rating,
          product.isExpansion ? 1 : 0,
          product.category,
          product.brand,
          product.image,
        );
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  listPage(page: number, pageSize: number): ProductPage {
    // Fetch one extra row: its presence answers `hasNext` without a COUNT.
    const rows = this.db
      .prepare('SELECT * FROM products ORDER BY id LIMIT ? OFFSET ?')
      .all(pageSize + 1, (page - 1) * pageSize) as unknown as ProductRow[];
    return {
      products: rows.slice(0, pageSize).map(toProduct),
      page,
      pageSize,
      hasNext: rows.length > pageSize,
    };
  }

  getById(id: number): Product | null {
    const row = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as
      | ProductRow
      | undefined;
    return row ? toProduct(row) : null;
  }

  close(): void {
    this.db.close();
  }
}
