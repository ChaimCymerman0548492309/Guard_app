import { describe, it, expect } from 'vitest';
import { AppCategory } from './enums.js';
import { inferAppCategory } from './app-categories.js';

describe('inferAppCategory', () => {
  it('detects photo apps', () => {
    expect(inferAppCategory('com.google.android.apps.photos', 'Photos')).toBe(AppCategory.PHOTO);
    expect(inferAppCategory('com.example.camera', 'My Camera')).toBe(AppCategory.PHOTO);
  });

  it('detects messaging apps', () => {
    expect(inferAppCategory('com.whatsapp', 'WhatsApp')).toBe(AppCategory.MESSAGING);
    expect(inferAppCategory('org.telegram.messenger', 'Telegram')).toBe(AppCategory.MESSAGING);
  });

  it('detects social apps', () => {
    expect(inferAppCategory('com.instagram.android', 'Instagram')).toBe(AppCategory.SOCIAL);
    expect(inferAppCategory('com.twitter.android', 'Twitter')).toBe(AppCategory.SOCIAL);
  });

  it('detects browser apps', () => {
    expect(inferAppCategory('com.android.chrome', 'Chrome')).toBe(AppCategory.BROWSER);
  });

  it('detects finance apps', () => {
    expect(inferAppCategory('com.paypal.android', 'PayPal')).toBe(AppCategory.FINANCE);
  });

  it('defaults to utility', () => {
    expect(inferAppCategory('com.example.calculator', 'Calculator')).toBe(AppCategory.UTILITY);
  });
});
