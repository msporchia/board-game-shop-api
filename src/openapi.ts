import { AppFactory } from './core/app_factory.js';
import { Config } from './core/config.js';

async function main(): Promise<void> {
  const app = await new AppFactory(
    Config.fromEnv({
      DB_PATH: ':memory:',
      CATALOG_SEED_PATH: './data/sample-catalog.json',
    }),
    { logger: false },
  ).create();

  try {
    await app.ready();
    process.stdout.write(`${JSON.stringify(app.swagger(), null, 2)}\n`);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
