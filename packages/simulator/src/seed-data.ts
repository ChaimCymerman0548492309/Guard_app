import { AppCategory, TrustLevel } from '@guardian/shared';
import type { App } from '@guardian/shared';

export const SEED_APPS: App[] = [
  {
    id: 'app-whatsapp',
    packageName: 'com.whatsapp',
    displayName: 'WhatsApp',
    category: AppCategory.SOCIAL,
    isSystem: false,
    trustLevel: TrustLevel.TRUSTED,
  },
  {
    id: 'app-google-photos',
    packageName: 'com.google.android.apps.photos',
    displayName: 'Google Photos',
    category: AppCategory.PHOTO,
    isSystem: false,
    trustLevel: TrustLevel.TRUSTED,
  },
  {
    id: 'app-photo-editor',
    packageName: 'com.photoeditor.cleaner',
    displayName: 'Photo Editor',
    category: AppCategory.PHOTO,
    isSystem: false,
    trustLevel: TrustLevel.UNKNOWN,
  },
  {
    id: 'app-calculator',
    packageName: 'com.android.calculator2',
    displayName: 'Calculator',
    category: AppCategory.UTILITY,
    isSystem: true,
    trustLevel: TrustLevel.TRUSTED,
  },
  {
    id: 'app-unknown',
    packageName: 'com.unknown.suspicious',
    displayName: 'Unknown App',
    category: AppCategory.UNKNOWN,
    isSystem: false,
    trustLevel: TrustLevel.UNKNOWN,
  },
];

export const PHOTO_CLEANER_APP_ID = 'app-photo-editor';
