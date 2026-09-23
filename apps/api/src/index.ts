import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { prepareDatabase } from './lib/prepare-database.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

const app = createApp();

app.listen(PORT, HOST, () => {
  logger.info({ port: PORT, host: HOST }, 'Guardian API listening');
});

if (process.env.PREPARE_DATABASE_ON_BOOT === 'true') {
  void prepareDatabase().catch((err) => {
    logger.error({ err }, 'Database preparation failed');
  });
}
