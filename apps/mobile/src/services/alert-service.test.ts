import { describe, it, expect } from 'vitest';
import { generateAlertsFromAssessments, getNotificationPolicy } from './alert-service';
import { AppCategory, RiskLevel, TrustLevel } from '@guardian/shared';

describe('alert-service', () => {
  it('skips SAFE assessments', () => {
    const alerts = generateAlertsFromAssessments(
      [
        {
          id: 'a1',
          packageName: 'com.test',
          displayName: 'Test',
          category: AppCategory.UTILITY,
          isSystem: false,
          trustLevel: TrustLevel.NEUTRAL,
        },
      ],
      [
        {
          id: 'r1',
          appId: 'a1',
          score: 10,
          level: RiskLevel.SAFE,
          triggeredRules: [],
          explanation: 'All good',
          assessedAt: new Date(),
        },
      ],
    );
    expect(alerts).toHaveLength(0);
  });

  it('creates immediate alerts for suspicious activity', () => {
    const alerts = generateAlertsFromAssessments(
      [
        {
          id: 'a1',
          packageName: 'com.test',
          displayName: 'Test',
          category: AppCategory.UTILITY,
          isSystem: false,
          trustLevel: TrustLevel.NEUTRAL,
        },
      ],
      [
        {
          id: 'r1',
          appId: 'a1',
          score: 90,
          level: RiskLevel.SUSPICIOUS,
          triggeredRules: ['LARGE_UPLOAD'],
          explanation: 'Large upload detected',
          assessedAt: new Date(),
        },
      ],
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].notifyImmediately).toBe(true);
  });

  it('uses silent policy for safe level', () => {
    expect(getNotificationPolicy(RiskLevel.SAFE).silent).toBe(true);
    expect(getNotificationPolicy(RiskLevel.UNUSUAL).immediate).toBe(false);
    expect(getNotificationPolicy(RiskLevel.SUSPICIOUS).offerBlock).toBe(true);
  });

  it('suppresses unusual alerts for trusted apps', () => {
    const alerts = generateAlertsFromAssessments(
      [
        {
          id: 'a1',
          packageName: 'com.trusted',
          displayName: 'Trusted App',
          category: AppCategory.SOCIAL,
          isSystem: false,
          trustLevel: TrustLevel.TRUSTED,
        },
      ],
      [
        {
          id: 'r1',
          appId: 'a1',
          score: 40,
          level: RiskLevel.UNUSUAL,
          triggeredRules: ['NEW_DOMAIN'],
          explanation: 'New domain seen',
          assessedAt: new Date(),
        },
      ],
    );
    expect(alerts).toHaveLength(0);
  });
});
