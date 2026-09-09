import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: {},
  NativeEventEmitter: class {
    addListener() {
      return { remove: () => {} };
    }
  },
}));

describe('guardian-vpn bridge', () => {
  beforeEach(async () => {
    const mod = await import('../native/guardian-vpn');
    mod.__resetGuardianVpnServiceForTests();
  });

  it('returns unsupported on non-Android platforms', async () => {
    const { getGuardianVpnService } = await import('../native/guardian-vpn');
    const vpn = getGuardianVpnService();
    expect(await vpn.isSupported()).toBe(false);
    const status = await vpn.getStatus();
    expect(status.isSupported).toBe(false);
  });

  it('maps native event payloads', async () => {
    const { mapNativeEvent } = await import('../native/guardian-vpn.types');
    const mapped = mapNativeEvent({
      id: 'evt-1',
      packageName: 'com.example',
      domain: 'example.com',
      bytesSent: 100,
      bytesReceived: 50,
      direction: 'OUTBOUND',
      protocol: 'TCP',
      timestamp: 1234567890,
    });
    expect(mapped.domain).toBe('example.com');
    expect(mapped.bytesSent).toBe(100);
  });
});
