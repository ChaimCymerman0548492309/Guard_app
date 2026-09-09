import { createApp } from './app.js';
import { logger } from './lib/logger.js';

const PORT = Number(process.env.PORT) || 3000;

const app = createApp();

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Guardian API listening');
});
