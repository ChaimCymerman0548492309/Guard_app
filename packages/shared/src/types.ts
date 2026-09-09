import type { AppCategory, RiskLevel, SecurityEventType, TrustLevel } from './enums.js';

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
}

export interface AppBehaviorBaseline {
  appId: string;
  avgDailyConnections: number;
  knownDomains: string[];
  avgUploadBytes: number;
  lastUpdated: Date;
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
