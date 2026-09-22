import { isDatabaseAvailable } from './prisma.js';

/** Simulator fake data — only when DEV_SIMULATOR=true (never as DB fallback). */
export function isSimulatorEnabled(): boolean {
  return process.env.DEV_SIMULATOR === 'true';
}

export async function shouldUseSimulatorDatastore(): Promise<boolean> {
  return isSimulatorEnabled();
}

export async function isRealPersistenceActive(): Promise<boolean> {
  return !isSimulatorEnabled() && (await isDatabaseAvailable());
}

export const REAL_DEVICES_ERROR = {
  code: 'REAL_DEVICES_ONLY',
  message:
    'Simulator mode is disabled. Connect PostgreSQL and sync a physical device via the mobile app.',
} as const;

export const DATABASE_UNAVAILABLE_ERROR = {
  code: 'DATABASE_UNAVAILABLE',
  message: 'Database is not connected. Deploy API with PostgreSQL for real device data.',
} as const;
