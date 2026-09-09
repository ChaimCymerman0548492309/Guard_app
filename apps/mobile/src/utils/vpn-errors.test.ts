import { describe, it, expect } from 'vitest';
import { isVpnErrorKey, mapVpnErrorMessage } from './vpn-errors';

describe('vpn error mapping', () => {
  it('maps permission denied to i18n key', () => {
    expect(mapVpnErrorMessage(new Error('VPN permission was not granted'))).toBe(
      'permissions.vpnDenied',
    );
  });

  it('maps revoked permission to i18n key', () => {
    expect(mapVpnErrorMessage('VPN permission was revoked by the system')).toBe(
      'permissions.vpnRevoked',
    );
  });

  it('returns original message for unknown errors', () => {
    expect(mapVpnErrorMessage(new Error('Something unexpected'))).toBe('Something unexpected');
  });

  it('identifies i18n keys', () => {
    expect(isVpnErrorKey('permissions.vpnDenied')).toBe(true);
    expect(isVpnErrorKey('raw error')).toBe(false);
  });
});
