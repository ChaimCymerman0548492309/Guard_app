import { describe, it, expect } from 'vitest';
import { VIRTUAL_DEVICE_SEEDS, DEFAULT_VIRTUAL_DEVICE_ID } from './virtual-devices.js';

describe('virtual devices', () => {
  it('seeds three lab devices', () => {
    expect(VIRTUAL_DEVICE_SEEDS.length).toBe(3);
  });

  it('has a default device id', () => {
    expect(DEFAULT_VIRTUAL_DEVICE_ID).toBe(VIRTUAL_DEVICE_SEEDS[0].id);
  });
});
