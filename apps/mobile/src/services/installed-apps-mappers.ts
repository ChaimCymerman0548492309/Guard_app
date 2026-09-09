import type { App } from '@guardian/shared';
import { AppCategory, TrustLevel } from '@guardian/shared';
import type { NativeInstalledApp } from '../native/installed-apps.types';

const PHOTO_KEYWORDS = ['photo', 'camera', 'gallery', 'image', 'pics'];
const SOCIAL_KEYWORDS = ['social', 'chat', 'messenger', 'whatsapp', 'telegram', 'facebook', 'instagram'];

export function inferAppCategory(packageName: string, displayName: string): AppCategory {
  const haystack = `${packageName} ${displayName}`.toLowerCase();
  if (PHOTO_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return AppCategory.PHOTO;
  }
  if (SOCIAL_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return AppCategory.SOCIAL;
  }
  return AppCategory.UTILITY;
}

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
