import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBatchSchema } from './sync-batch-schema.js';

describe('eventBatchSchema', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'UTC');
  });

  it('accepts full mobile sync payload', () => {
    const parsed = eventBatchSchema.safeParse({
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
      deviceName: 'Pixel 7',
      platform: 'android',
      apps: [
        {
          packageName: 'com.android.chrome',
          displayName: 'Chrome',
          category: 'BROWSER',
          isSystem: false,
          trustLevel: 'NEUTRAL',
        },
      ],
      assessments: [
        {
          id: '650e8400-e29b-41d4-a716-446655440001',
          packageName: 'com.android.chrome',
          score: 45,
          level: 'UNUSUAL',
          triggeredRules: ['KNOWN_TRACKER'],
          explanation: 'Unusual activity',
          assessedAt: '2026-01-01T12:00:00.000Z',
        },
      ],
      alerts: [],
      networkEvents: [
        {
          clientEventId: 'evt-1',
          appPackageName: 'com.android.chrome',
          domain: 'ads.example.com',
          bytesSent: 100,
          bytesReceived: 50,
          isNewDomain: true,
          timestamp: '2026-01-01T12:00:00.000Z',
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('allows metadata-only batch with empty networkEvents', () => {
    const parsed = eventBatchSchema.safeParse({
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
      networkEvents: [],
      apps: [
        {
          packageName: 'com.test.app',
          displayName: 'Test',
          category: 'UNKNOWN',
          isSystem: false,
          trustLevel: 'UNKNOWN',
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
