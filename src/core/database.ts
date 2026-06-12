import { DatabaseSync } from 'node:sqlite';

/**
 * The shared SQLite handle for the shop's owned data (`shop.db`). Opened once
 * at composition time and injected into the store classes, which own their
 * tables. Schema changes are wipe-and-reseed (delete the file) — the demo has
 * no migration story by design.
 */
export class Database {
  readonly handle: DatabaseSync;

  constructor(path: string) {
    this.handle = new DatabaseSync(path);
    this.handle.exec('PRAGMA foreign_keys = ON');
  }

  /** Runs `fn` in a transaction: commit on return, rollback on throw. */
  transaction<T>(fn: () => T): T {
    this.handle.exec('BEGIN');
    try {
      const result = fn();
      this.handle.exec('COMMIT');
      return result;
    } catch (err) {
      this.handle.exec('ROLLBACK');
      throw err;
    }
  }

  close(): void {
    this.handle.close();
  }
}
