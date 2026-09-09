import type { App } from '@guardian/shared';
import { getInstalledAppsProvider } from '../native/installed-apps';
import { getDatabase } from '../db/database';
import { upsertApp } from '../db/repositories';
import type { EventPipeline } from '../pipeline/event-pipeline';
import { mapNativeAppToApp } from './installed-apps-mappers';

export async function syncInstalledAppsFromDevice(
  pipeline: EventPipeline,
): Promise<{ apps: App[]; source: 'device' | 'unavailable' }> {
  const provider = getInstalledAppsProvider();
  if (!provider.isSupported()) {
    return { apps: [], source: 'unavailable' };
  }

  const nativeApps = await provider.getLauncherApps();
  const db = await getDatabase();
  const apps: App[] = [];

  for (const nativeApp of nativeApps) {
    const app = mapNativeAppToApp(nativeApp);
    await upsertApp(db, app);
    pipeline.registerApp(app);
    apps.push(app);
  }

  return { apps, source: 'device' };
}
