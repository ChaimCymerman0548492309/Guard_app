import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function runCommand(command: string, args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit',
    });

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };

    const timer = setTimeout(() => {
      logger.warn({ command, args, timeoutMs }, 'Database prep timed out; API stays up');
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5_000).unref();
      finish();
    }, timeoutMs);

    child.on('error', (err) => {
      logger.warn({ command, args, err }, 'Database prep command could not start');
      finish();
    });

    child.on('exit', (code, signal) => {
      if (code === 0) {
        logger.info({ command, args }, 'Database prep command finished');
      } else {
        logger.warn({ command, args, code, signal }, 'Database prep command did not succeed');
      }
      finish();
    });
  });
}

/** Migrate and optionally seed without blocking the HTTP listener. */
export async function prepareDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    logger.warn('DATABASE_URL is unset; skipping migrate and seed');
    return;
  }

  logger.info('Applying database migrations');
  await runCommand(
    'npx',
    ['prisma', 'migrate', 'deploy', '--schema=prisma/schema.prisma'],
    120_000,
  );

  if (process.env.RUN_DB_SEED === 'true') {
    logger.info('Seeding database');
    await runCommand('pnpm', ['db:seed'], 60_000);
  }
}
