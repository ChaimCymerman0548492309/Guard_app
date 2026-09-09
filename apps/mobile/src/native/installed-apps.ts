import { NativeModules, Platform } from 'react-native';
import type { InstalledAppsProvider, NativeInstalledApp } from './installed-apps.types';

interface NativeModuleShape {
  getLauncherApps(): Promise<NativeInstalledApp[]>;
}

function createUnsupportedProvider(): InstalledAppsProvider {
  return {
    isSupported: () => false,
    async getLauncherApps() {
      return [];
    },
  };
}

function createAndroidProvider(): InstalledAppsProvider {
  const native = NativeModules.InstalledApps as NativeModuleShape | undefined;
  if (!native) {
    return createUnsupportedProvider();
  }

  return {
    isSupported: () => true,
    getLauncherApps: () => native.getLauncherApps(),
  };
}

let cached: InstalledAppsProvider | null = null;

export function getInstalledAppsProvider(): InstalledAppsProvider {
  if (cached) return cached;
  cached = Platform.OS === 'android' ? createAndroidProvider() : createUnsupportedProvider();
  return cached;
}

export function __resetInstalledAppsProviderForTests(): void {
  cached = null;
}

export type { InstalledAppsProvider, NativeInstalledApp };
