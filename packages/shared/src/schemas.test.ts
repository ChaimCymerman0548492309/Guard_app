import { describe, it, expect } from 'vitest';
import { appSchema, riskCountsSchema } from './schemas.js';
import { AppCategory, TrustLevel } from './enums.js';

describe('schemas', () => {
  it('validates a valid app', () => {
    const result = appSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      packageName: 'com.example.app',
      displayName: 'Example',
      category: AppCategory.UTILITY,
      isSystem: false,
      trustLevel: TrustLevel.NEUTRAL,
    });
    expect(result.success).toBe(true);
  });

  it('validates risk counts', () => {
    const result = riskCountsSchema.safeParse({ safe: 3, unusual: 1, suspicious: 1 });
    expect(result.success).toBe(true);
  });
});
