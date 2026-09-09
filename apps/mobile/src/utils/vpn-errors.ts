const ERROR_PATTERNS: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /permission.*not granted|PERMISSION_DENIED/i, key: 'permissions.vpnDenied' },
  { pattern: /permission.*revoked/i, key: 'permissions.vpnRevoked' },
  { pattern: /NO_ACTIVITY/i, key: 'permissions.vpnNoActivity' },
  { pattern: /UNSUPPORTED|not available/i, key: 'permissions.unsupported' },
  { pattern: /Failed to establish VPN/i, key: 'permissions.vpnFailed' },
];

/** Map native VPN error text to an i18n key, or return the original message. */
export function mapVpnErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  for (const { pattern, key } of ERROR_PATTERNS) {
    if (pattern.test(message)) return key;
  }
  return message;
}

/** Returns true when the value is an i18n key (permissions.*). */
export function isVpnErrorKey(value: string): boolean {
  return value.startsWith('permissions.');
}
