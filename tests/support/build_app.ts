import type { FastifyInstance } from 'fastify';
import { AppFactory, type AppFactoryDependencies } from '../../src/core/app_factory.js';
import { Config } from '../../src/core/config.js';

/**
 * The real app over an in-memory database seeded from the checked-in catalog
 * fixture — route tests exercise the full wiring, only the storage location
 * and seed source differ from production.
 */
export async function buildApp(
  dependencies: AppFactoryDependencies = {},
): Promise<FastifyInstance> {
  const app = await new AppFactory(
    Config.fromEnv({
      DB_PATH: ':memory:',
      CATALOG_SEED_PATH: 'tests/support/catalog_seed.fixture.json',
    }),
    { logger: false, ...dependencies },
  ).create();
  await app.ready();
  return app;
}
