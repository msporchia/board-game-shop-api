import { Config } from './core/config.js';
import { AppFactory } from './core/app_factory.js';

/**
 * Composition root: the only module with side effects at import time.
 * Builds the config from the environment, builds the app, starts listening.
 */
async function main(): Promise<void> {
  const config = Config.fromEnv(process.env);
  const app = new AppFactory(config).create();

  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
