import { describe, it, expect } from 'vitest';
import {
  LocalDomainReputationProvider,
  lookupDomainReputation,
  TRACKER_REPUTATION_DB,
} from './domain-reputation.js';

describe('lookupDomainReputation', () => {
  it('matches exact tracker domains', () => {
    const result = lookupDomainReputation('doubleclick.net');
    expect(result).not.toBeNull();
    expect(result?.isTracker).toBe(true);
    expect(result?.category).toBe('advertising');
  });

  it('matches subdomains', () => {
    const result = lookupDomainReputation('stats.g.doubleclick.net');
    expect(result).not.toBeNull();
    expect(result?.isTracker).toBe(true);
  });

  it('returns null for unknown domains', () => {
    expect(lookupDomainReputation('example.com')).toBeNull();
  });

  it('has expanded tracker list', () => {
    expect(TRACKER_REPUTATION_DB.length).toBeGreaterThanOrEqual(15);
  });
});

describe('LocalDomainReputationProvider', () => {
  const provider = new LocalDomainReputationProvider();

  it('lookup returns reputation async', async () => {
    const result = await provider.lookup('google-analytics.com');
    expect(result?.reputationScore).toBeLessThanOrEqual(30);
  });
});
