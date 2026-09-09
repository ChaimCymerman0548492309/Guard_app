import { describe, it, expect } from 'vitest';
import { AppCategory, SecurityEventType } from '@guardian/shared';
import { sensitiveAppBehaviorRule } from './sensitive-app-behavior.js';

describe('sensitiveAppBehaviorRule', () => {
  const baseContext = {
    appId: 'app-test',
    networkEvents: [],
    securityEvents: [],
    knownTrackerDomains: [],
  };

  it('uses lower threshold for photo category apps', () => {
    const result = sensitiveAppBehaviorRule.evaluate({
      ...baseContext,
      appCategory: AppCategory.PHOTO,
      securityEvents: [
        {
          id: 'e1',
          appId: 'app-test',
          type: SecurityEventType.PHOTO_ACCESS,
          timestamp: new Date(),
          metadata: { photoCount: 250 },
        },
      ],
    });

    expect(result.triggered).toBe(true);
  });

  it('requires higher threshold for non-photo apps', () => {
    const result = sensitiveAppBehaviorRule.evaluate({
      ...baseContext,
      appCategory: AppCategory.UTILITY,
      securityEvents: [
        {
          id: 'e1',
          appId: 'app-test',
          type: SecurityEventType.PHOTO_ACCESS,
          timestamp: new Date(),
          metadata: { photoCount: 250 },
        },
      ],
    });

    expect(result.triggered).toBe(false);
  });
});
