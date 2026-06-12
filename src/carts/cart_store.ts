import type { Database } from '../core/database.js';

export interface CartLine {
  productId: number;
  quantity: number;
}

/**
 * SQLite-backed store of raw cart lines (customer × product × quantity).
 * Product data and totals are composed on top by `CartService` — this class
 * owns only the `cart_items` table.
 */
export class CartStore {
  constructor(private readonly db: Database) {
    this.db.handle.exec(`
      CREATE TABLE IF NOT EXISTS cart_items (
        customer_id TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        PRIMARY KEY (customer_id, product_id)
      )
    `);
  }

  linesFor(customerId: string): CartLine[] {
    const rows = this.db.handle
      .prepare(
        'SELECT product_id, quantity FROM cart_items WHERE customer_id = ? ORDER BY product_id',
      )
      .all(customerId) as unknown as { product_id: number; quantity: number }[];
    return rows.map((row) => ({ productId: row.product_id, quantity: row.quantity }));
  }

  upsertLine(customerId: string, productId: number, quantity: number): void {
    this.db.handle
      .prepare(
        `INSERT INTO cart_items (customer_id, product_id, quantity) VALUES (?, ?, ?)
         ON CONFLICT (customer_id, product_id) DO UPDATE SET quantity = excluded.quantity`,
      )
      .run(customerId, productId, quantity);
  }

  removeLine(customerId: string, productId: number): void {
    this.db.handle
      .prepare('DELETE FROM cart_items WHERE customer_id = ? AND product_id = ?')
      .run(customerId, productId);
  }

  clear(customerId: string): void {
    this.db.handle.prepare('DELETE FROM cart_items WHERE customer_id = ?').run(customerId);
  }
}
