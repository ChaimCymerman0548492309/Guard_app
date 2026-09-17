import { describe, it, expect } from 'vitest';
import { t } from './i18n';

describe('i18n', () => {
  it('returns Hebrew strings', () => {
    expect(t('he', 'title')).toBe('Guardian Dashboard');
  });

  it('returns English strings', () => {
    expect(t('en', 'devices')).toBe('Devices');
  });
});
