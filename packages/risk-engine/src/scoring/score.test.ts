import { describe, it, expect } from 'vitest';
import { calculateScore } from './score.js';
import { TrustLevel, RuleId } from '@guardian/shared';
describe('calculateScore', () => {
  it('applies trusted multiplier', () => {
    expect(calculateScore([{ ruleId: RuleId.KNOWN_TRACKER, triggered: true, weight: 25, reason: '' }], TrustLevel.TRUSTED)).toBe(13);
  });
});
