import { describe, it, expect } from 'vitest';
import { isNewDomainForApp, updateBaseline } from './baseline-service';

describe('baseline-service', () => {
  it('detects new domains', () => {
    const baselines = [
      {
        appId: 'app-1',
        avgDailyConnections: 5,
        knownDomains: ['known.com'],
        avgUploadBytes: 100,
        activeHours: [10],
        lastUpdated: new Date(),
      },
    ];
    expect(isNewDomainForApp(baselines, 'app-1', 'known.com')).toBe(false);
    expect(isNewDomainForApp(baselines, 'app-1', 'new.com')).toBe(true);
    expect(isNewDomainForApp(baselines, 'app-2', 'any.com')).toBe(true);
  });

  it('updates baseline with new event data', () => {
    const baselines: Parameters<typeof updateBaseline>[0] = [];
    const updated = updateBaseline(baselines, {
      id: 'n1',
      appId: 'app-1',
      domain: 'example.com',
      bytesSent: 500,
      bytesReceived: 100,
      isNewDomain: true,
      timestamp: new Date('2026-01-15T14:00:00Z'),
    });
    expect(updated.knownDomains).toContain('example.com');
    expect(updated.activeHours).toContain(14);
    expect(updated.avgUploadBytes).toBeGreaterThan(0);
  });
});
