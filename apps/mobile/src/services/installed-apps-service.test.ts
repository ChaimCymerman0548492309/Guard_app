import { describe, it, expect } from 'vitest';
import { AppCategory } from '@guardian/shared';
import { inferAppCategory, mapNativeAppToApp } from './installed-apps-mappers';

describe('installed-apps-mappers', () => {
  it('infers photo category from package name', () => {
    expect(inferAppCategory('com.google.android.apps.photos', 'Photos')).toBe(
      AppCategory.PHOTO,
    );
  });

  it('infers social category from display name', () => {
    expect(inferAppCategory('com.example.app', 'WhatsApp Messenger')).toBe(
      AppCategory.SOCIAL,
    );
  });

  it('defaults to utility for unknown apps', () => {
    expect(inferAppCategory('com.example.calculator', 'Calculator')).toBe(
      AppCategory.UTILITY,
    );
  });

  it('maps native app metadata to shared App type', () => {
    const app = mapNativeAppToApp({
      packageName: 'com.example.chat',
      displayName: 'Example Chat',
      isSystem: false,
    });

    expect(app).toEqual({
      id: 'app-com.example.chat',
      packageName: 'com.example.chat',
      displayName: 'Example Chat',
      category: AppCategory.SOCIAL,
      isSystem: false,
      trustLevel: 'UNKNOWN',
    });
  });

  it('marks system apps with SYSTEM category', () => {
    const app = mapNativeAppToApp({
      packageName: 'com.android.settings',
      displayName: 'Settings',
      isSystem: true,
    });

    expect(app.category).toBe(AppCategory.SYSTEM);
    expect(app.isSystem).toBe(true);
  });
});
