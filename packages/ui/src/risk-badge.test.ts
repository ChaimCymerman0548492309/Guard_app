import { describe, it, expect } from 'vitest';
import { getRiskBadgeColor, getRiskBadgeLabel } from './risk-badge.js';
import { RiskLevel } from '@guardian/shared';

describe('risk-badge', () => {
  it('returns color for SAFE', () => {
    expect(getRiskBadgeColor(RiskLevel.SAFE)).toBe('#22c55e');
  });

  it('returns label for SUSPICIOUS', () => {
    expect(getRiskBadgeLabel(RiskLevel.SUSPICIOUS)).toBe('Suspicious');
  });
});
