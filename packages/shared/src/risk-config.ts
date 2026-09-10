/** Risk scoring thresholds and rule weights — single source of truth for engine + config */
export const RISK_THRESHOLDS = {
  SAFE_MAX: 29,
  UNUSUAL_MAX: 69,
  SUSPICIOUS_MIN: 70,
} as const;

export const RULE_WEIGHTS = {
  KNOWN_TRACKER: 30,
  NEW_DOMAIN: 20,
  LARGE_UPLOAD: 25,
  UNUSUAL_NETWORK_ACTIVITY: 20,
  SENSITIVE_APP_BEHAVIOR: 35,
} as const;

export const LARGE_UPLOAD_BYTES = 100 * 1024 * 1024;
export const UNUSUAL_CONNECTION_COUNT = 50;
export const SENSITIVE_PHOTO_THRESHOLD = 500;
