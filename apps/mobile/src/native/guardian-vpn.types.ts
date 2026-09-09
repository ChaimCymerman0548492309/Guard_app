import type {
  NativeNetworkEventPayload,
  NetworkDirection,
  NetworkProtocol,
  VpnServiceStatus,
  VpnStatus,
} from '@guardian/shared';

export interface Subscription {
  remove(): void;
}

export interface GuardianVpnService {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): Promise<VpnServiceStatus>;
  isSupported(): Promise<boolean>;
  blockDomain(domain: string): Promise<boolean>;
  onNetworkEvent(listener: (event: NativeNetworkEventPayload) => void): Subscription;
}

export type { NativeNetworkEventPayload, VpnServiceStatus, VpnStatus };

export function mapNativeEvent(raw: Record<string, unknown>): NativeNetworkEventPayload {
  return {
    id: String(raw.id ?? ''),
    packageName: String(raw.packageName ?? 'unknown'),
    domain: String(raw.domain ?? ''),
    bytesSent: Number(raw.bytesSent ?? 0),
    bytesReceived: Number(raw.bytesReceived ?? 0),
    direction: (raw.direction as NetworkDirection) ?? 'OUTBOUND',
    protocol: (raw.protocol as NetworkProtocol) ?? 'OTHER',
    timestamp: Number(raw.timestamp ?? Date.now()),
  };
}
