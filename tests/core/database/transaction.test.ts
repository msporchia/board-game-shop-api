import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Database } from '../../../src/core/database.js';

describe('Database.transaction', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.handle.exec('CREATE TABLE t (v TEXT)');
  });

  afterEach(() => {
    db.close();
  });

  it('commits on return and passes the result through', () => {
    const result = db.transaction(() => {
      db.handle.prepare('INSERT INTO t (v) VALUES (?)').run('kept');
      return 'done';
    });

    expect(result).toBe('done');
    expect(db.handle.prepare('SELECT COUNT(*) AS n FROM t').get()).toEqual({ n: 1 });
  });

  it('rolls back on throw and rethrows', () => {
    expect(() =>
      db.transaction(() => {
        db.handle.prepare('INSERT INTO t (v) VALUES (?)').run('discarded');
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(db.handle.prepare('SELECT COUNT(*) AS n FROM t').get()).toEqual({ n: 0 });
  });
});
