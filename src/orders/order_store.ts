import type { Database } from '../core/database.js';
import type { Order, OrderItem } from './order.js';

interface OrderRow {
  id: number;
  customer_id: string;
  created_at: string;
  total_cents: number;
}

interface OrderItemRow {
  product_id: number;
  name: string;
  unit_price_cents: number;
  quantity: number;
}

function toItem(row: OrderItemRow): OrderItem {
  return {
    productId: row.product_id,
    name: row.name,
    unitPriceCents: row.unit_price_cents,
    quantity: row.quantity,
    lineTotalCents: row.unit_price_cents * row.quantity,
  };
}

/**
 * SQLite-backed store of orders and their snapshot lines. Owns the `orders`
 * and `order_items` tables on the shared database.
 */
export class OrderStore {
  constructor(private readonly db: Database) {
    this.db.handle.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        total_cents INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS order_items (
        order_id INTEGER NOT NULL REFERENCES orders(id),
        product_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        unit_price_cents INTEGER NOT NULL,
        quantity INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    `);
  }

  insert(order: Omit<Order, 'id'>): Order {
    const result = this.db.handle
      .prepare('INSERT INTO orders (customer_id, created_at, total_cents) VALUES (?, ?, ?)')
      .run(order.customerId, order.createdAt, order.totalCents);
    const orderId = Number(result.lastInsertRowid);

    const insertItem = this.db.handle.prepare(
      `INSERT INTO order_items (order_id, product_id, name, unit_price_cents, quantity)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const item of order.items) {
      insertItem.run(orderId, item.productId, item.name, item.unitPriceCents, item.quantity);
    }

    return { ...order, id: orderId };
  }

  /** A customer's orders, newest first. */
  listFor(customerId: string): Order[] {
    const orders = this.db.handle
      .prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC')
      .all(customerId) as unknown as OrderRow[];
    const itemsFor = this.db.handle.prepare(
      'SELECT product_id, name, unit_price_cents, quantity FROM order_items WHERE order_id = ?',
    );
    return orders.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      createdAt: row.created_at,
      totalCents: row.total_cents,
      items: (itemsFor.all(row.id) as unknown as OrderItemRow[]).map(toItem),
    }));
  }
}
