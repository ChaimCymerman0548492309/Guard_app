export const APP_VERSION = '1.0.0';

export function getPrivacyPolicyUrl(): string {
  return process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? 'https://guardian.app/privacy';
}
