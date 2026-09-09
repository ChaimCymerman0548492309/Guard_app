import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { GuardianVpnService, Subscription } from './guardian-vpn.types';
import { mapNativeEvent } from './guardian-vpn.types';
import { VpnStatus } from '@guardian/shared';

const LINKING_ERROR =
  'Guardian VPN native module is unavailable. Use EXPO_PUBLIC_DEV_SIMULATOR=true for demo mode.';

interface NativeModuleShape {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): Promise<{
    status: string;
    isSupported: boolean;
    errorMessage?: string;
    stats?: { packetsProcessed: number; eventsEmitted: number; blockedDomains: number };
  }>;
  isSupported(): Promise<boolean>;
  blockDomain(domain: string): Promise<boolean>;
}

function createUnsupportedService(): GuardianVpnService {
  return {
    async start() {
      throw new Error(LINKING_ERROR);
    },
    async stop() {
      /* no-op */
    },
    async getStatus() {
      return { status: VpnStatus.UNSUPPORTED, isSupported: false, errorMessage: LINKING_ERROR };
    },
    async isSupported() {
      return false;
    },
    async blockDomain() {
      return false;
    },
    onNetworkEvent() {
      return { remove() {} };
    },
  };
}

function createAndroidService(): GuardianVpnService {
  const native = NativeModules.GuardianVpn as NativeModuleShape | undefined;
  if (!native) {
    return createUnsupportedService();
  }

  const emitter = new NativeEventEmitter(NativeModules.GuardianVpn);

  return {
    start: () => native.start(),
    stop: () => native.stop(),
    getStatus: async () => {
      const result = await native.getStatus();
      return {
        status: result.status as VpnStatus,
        isSupported: result.isSupported,
        errorMessage: result.errorMessage,
        stats: result.stats
          ? {
              packetsProcessed: Number(result.stats.packetsProcessed ?? 0),
              eventsEmitted: Number(result.stats.eventsEmitted ?? 0),
              blockedDomains: Number(result.stats.blockedDomains ?? 0),
            }
          : undefined,
      };
    },
    isSupported: () => native.isSupported(),
    blockDomain: (domain) => native.blockDomain(domain),
    onNetworkEvent(listener) {
      const subscription = emitter.addListener('GuardianVpnNetworkEvent', (event) => {
        listener(mapNativeEvent(event as Record<string, unknown>));
      });
      return { remove: () => subscription.remove() };
    },
  };
}

let cached: GuardianVpnService | null = null;

export function getGuardianVpnService(): GuardianVpnService {
  if (cached) return cached;
  cached = Platform.OS === 'android' ? createAndroidService() : createUnsupportedService();
  return cached;
}

export function __resetGuardianVpnServiceForTests(): void {
  cached = null;
}

export type { GuardianVpnService, Subscription };
