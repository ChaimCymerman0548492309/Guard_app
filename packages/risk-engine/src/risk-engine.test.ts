import { describe, it, expect } from 'vitest';
import { RiskDetector } from './detectors/risk-detector.js';
import { RiskLevel, SecurityEventType } from '@guardian/shared';
import type { NetworkEvent, SecurityEvent } from '@guardian/shared';

const APP_ID = '550e8400-e29b-41d4-a716-446655440001';

function makeNetworkEvent(overrides: Partial<NetworkEvent> = {}): NetworkEvent {
  return {
    id: 'net-1',
    appId: APP_ID,
    domain: 'example.com',
    bytesSent: 0,
    bytesReceived: 1000,
    isNewDomain: false,
    timestamp: new Date(),
    ...overrides,
  };
}

function makeSecurityEvent(overrides: Partial<SecurityEvent> = {}): SecurityEvent {
  return {
    id: 'sec-1',
    appId: APP_ID,
    type: SecurityEventType.FILE_ACCESS,
    timestamp: new Date(),
    metadata: {},
    ...overrides,
  };
}

describe('RiskDetector', () => {
  const detector = new RiskDetector();

  it('returns SAFE for normal activity', () => {
    const result = detector.assess({
      appId: APP_ID,
      networkEvents: [makeNetworkEvent()],
      securityEvents: [],
    });
    expect(result.level).toBe(RiskLevel.SAFE);
    expect(result.score).toBeLessThanOrEqual(29);
  });

  it('triggers KNOWN_TRACKER rule', () => {
    const result = detector.assess({
      appId: APP_ID,
      networkEvents: [makeNetworkEvent({ domain: 'ads.doubleclick.net' })],
      securityEvents: [],
    });
    expect(result.triggeredRules).toContain('KNOWN_TRACKER');
  });

  it('triggers NEW_DOMAIN rule', () => {
    const result = detector.assess({
      appId: APP_ID,
      networkEvents: [makeNetworkEvent({ domain: 'newsite.xyz', isNewDomain: true })],
      securityEvents: [],
    });
    expect(result.triggeredRules).toContain('NEW_DOMAIN');
  });

  it('triggers LARGE_UPLOAD rule for 350MB upload', () => {
    const result = detector.assess({
      appId: APP_ID,
      networkEvents: [
        makeNetworkEvent({ bytesSent: 350 * 1024 * 1024, domain: 'upload.example.com' }),
      ],
      securityEvents: [],
    });
    expect(result.triggeredRules).toContain('LARGE_UPLOAD');
  });

  it('triggers SENSITIVE_APP_BEHAVIOR for 1200 photos', () => {
    const result = detector.assess({
      appId: APP_ID,
      networkEvents: [],
      securityEvents: [
        makeSecurityEvent({
          type: SecurityEventType.PHOTO_ACCESS,
          metadata: { photoCount: 1200 },
        }),
      ],
    });
    expect(result.triggeredRules).toContain('SENSITIVE_APP_BEHAVIOR');
  });

  it('Photo Cleaner demo scenario yields HIGH RISK (SUSPICIOUS)', () => {
    const result = detector.assess({
      appId: APP_ID,
      networkEvents: [
        makeNetworkEvent({
          domain: 'unknown-tracker.io',
          isNewDomain: true,
          bytesSent: 350 * 1024 * 1024,
        }),
      ],
      securityEvents: [
        makeSecurityEvent({
          type: SecurityEventType.PHOTO_ACCESS,
          metadata: { photoCount: 1200 },
        }),
      ],
    });
    expect(result.level).toBe(RiskLevel.SUSPICIOUS);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.triggeredRules.length).toBeGreaterThanOrEqual(3);
  });
});
