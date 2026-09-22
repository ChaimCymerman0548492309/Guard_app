import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Guardian',
  slug: 'guardian',
  version: '1.0.1',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1e3a5f',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.guardian.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#1e3a5f',
    },
    package: 'com.guardian.app',
    versionCode: 100,
  },
  plugins: ['expo-localization', 'expo-sqlite', 'expo-notifications'],
  extra: {
    ...config?.extra,
    privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? 'https://guardian.app/privacy',
    eas: {
      projectId: '2d168942-629c-407f-b54e-3e16c1b60293',
    },
  },
});
