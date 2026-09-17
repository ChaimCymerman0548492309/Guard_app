import type {
  AlertAction,
  AppCategory,
  NetworkDirection,
  NetworkProtocol,
  RiskLevel,
  SecurityEventType,
  TrustLevel,
  VpnStatus,
} from './enums.js';

export interface App {
  id: string;
  packageName: string;
  displayName: string;
  category: AppCategory;
  isSystem: boolean;
  trustLevel: TrustLevel;
  iconUrl?: string;
}

export interface SecurityEvent {
  id: string;
  appId: string;
  type: SecurityEventType;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface NetworkEvent {
  id: string;
  appId: string;
  domain: string;
  bytesSent: number;
  bytesReceived: number;
  isNewDomain: boolean;
  timestamp: Date;
  protocol?: NetworkProtocol;
  direction?: NetworkDirection;
  packageName?: string;
}

export interface RiskAssessment {
  id: string;
  appId: string;
  score: number;
  level: RiskLevel;
  triggeredRules: string[];
  explanation: string;
  assessedAt: Date;
}

export interface Alert {
  id: string;
  appId: string;
  riskAssessmentId: string;
  title: string;
  message: string;
  level: RiskLevel;
  acknowledged: boolean;
  createdAt: Date;
  userAction?: AlertAction;
  domain?: string;
  notifyImmediately?: boolean;
}

export interface AppBehaviorBaseline {
  appId: string;
  avgDailyConnections: number;
  knownDomains: string[];
  avgUploadBytes: number;
  activeHours: number[];
  lastUpdated: Date;
}

export interface TimelineEvent {
  id: string;
  appId: string;
  type: 'network' | 'security' | 'assessment' | 'alert';
  title: string;
  description: string;
  level?: RiskLevel;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface NativeNetworkEventPayload {
  id: string;
  packageName: string;
  domain: string;
  bytesSent: number;
  bytesReceived: number;
  direction: NetworkDirection;
  protocol: NetworkProtocol;
  timestamp: number;
}

export interface VpnConnectionStats {
  packetsProcessed: number;
  eventsEmitted: number;
  blockedDomains: number;
}

export interface VpnServiceStatus {
  status: VpnStatus;
  isSupported: boolean;
  errorMessage?: string;
  stats?: VpnConnectionStats;
}

export interface DomainReputationProvider {
  lookup(domain: string): Promise<DomainReputation | null>;
}

export interface DomainReputation {
  domain: string;
  isTracker: boolean;
  category: string;
  reputationScore: number;
}

export interface RiskCounts {
  safe: number;
  unusual: number;
  suspicious: number;
}

export type DeviceStatus = 'online' | 'offline' | 'syncing';

export interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  status: DeviceStatus;
  lastSyncAt: Date | null;
  appCount: number;
  riskCounts: RiskCounts;
  isVirtual: boolean;
}

export interface DeviceSummary extends DeviceInfo {
  recentAlerts: Array<{
    appId: string;
    appName: string;
    level: string;
    explanation: string;
    assessedAt: Date;
  }>;
}

export interface DashboardSummary {
  counts: RiskCounts;
  totalApps: number;
  totalDevices: number;
  recentAlerts: Array<{
    appId: string;
    appName: string;
    level: string;
    explanation: string;
    assessedAt: Date;
    deviceId?: string;
    deviceName?: string;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  meta?: {
    requestId: string;
    timestamp: string;
  };
}
