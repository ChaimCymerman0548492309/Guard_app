import type { App } from '@guardian/shared';
import { AppCategory, TrustLevel, inferAppCategory } from '@guardian/shared';
import type { NativeInstalledApp } from '../native/installed-apps.types';

export { inferAppCategory };

export function mapNativeAppToApp(native: NativeInstalledApp): App {
  const category = native.isSystem
    ? AppCategory.SYSTEM
    : inferAppCategory(native.packageName, native.displayName);

  return {
    id: `app-${native.packageName}`,
    packageName: native.packageName,
    displayName: native.displayName,
    category,
    isSystem: native.isSystem,
    trustLevel: TrustLevel.UNKNOWN,
  };
}
