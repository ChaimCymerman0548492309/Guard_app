import { AppCategory, TrustLevel } from '@guardian/shared';
import type { App } from '@guardian/shared';

const GENERIC_APP_NAMES = [
  'Gmail',
  'Chrome',
  'Maps',
  'YouTube',
  'Spotify',
  'Netflix',
  'Banking',
  'Weather',
  'Notes',
  'Calendar',
  'Camera',
  'Clock',
  'Files',
  'Settings',
  'Contacts',
  'Messages',
  'Phone',
  'Gallery',
  'Music',
  'Podcasts',
  'Drive',
  'Docs',
  'Sheets',
  'Translate',
  'News',
  'Reddit',
  'Twitter',
  'Instagram',
  'Facebook',
  'LinkedIn',
  'Zoom',
  'Slack',
];

const CORE_APPS: App[] = [
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

const FILLER_APPS: App[] = GENERIC_APP_NAMES.map((name, index) => ({
  id: `app-filler-${index + 1}`,
  packageName: `com.guardian.filler.${index + 1}`,
  displayName: name,
  category:
    index % 4 === 0
      ? AppCategory.SOCIAL
      : index % 4 === 1
        ? AppCategory.UTILITY
        : index % 4 === 2
          ? AppCategory.PHOTO
          : AppCategory.UNKNOWN,
  isSystem: index < 8,
  trustLevel: index < 12 ? TrustLevel.TRUSTED : TrustLevel.NEUTRAL,
}));

/** 37 monitored apps: 5 demo scenarios + 32 typical installed apps */
export const SEED_APPS: App[] = [...CORE_APPS, ...FILLER_APPS];

export const PHOTO_CLEANER_APP_ID = 'app-photo-editor';
export const MONITORED_APP_COUNT = SEED_APPS.length;
