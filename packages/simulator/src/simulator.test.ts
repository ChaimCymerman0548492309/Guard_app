import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSimulator } from './simulator.js';
import { PHOTO_CLEANER_APP_ID } from './seed-data.js';
import { RiskLevel } from '@guardian/shared';

describe('GuardianSimulator', () => {
  beforeEach(() => {
    process.env.DEV_SIMULATOR = 'true';
  });

  afterEach(() => {
    delete process.env.DEV_SIMULATOR;
  });

  it('generates seed apps', () => {
    const sim = createSimulator();
    const result = sim.run();
    expect(result.apps).toHaveLength(37);
    expect(result.apps.map((a) => a.displayName)).toContain('Photo Editor');
  });

  it('Photo Cleaner scenario is HIGH RISK', () => {
    const sim = createSimulator();
    const result = sim.run();
    const photoCleaner = result.assessments.find((a) => a.appId === PHOTO_CLEANER_APP_ID);
    expect(photoCleaner).toBeDefined();
    expect(photoCleaner!.level).toBe(RiskLevel.SUSPICIOUS);
    expect(photoCleaner!.triggeredRules).toContain('LARGE_UPLOAD');
    expect(photoCleaner!.triggeredRules).toContain('SENSITIVE_APP_BEHAVIOR');
    expect(photoCleaner!.triggeredRules).toContain('NEW_DOMAIN');
  });

  it('counts risk levels correctly', () => {
    const sim = createSimulator();
    const result = sim.run();
    expect(result.counts.safe + result.counts.unusual + result.counts.suspicious).toBe(37);
    expect(result.counts.suspicious).toBeGreaterThanOrEqual(1);
  });
});
