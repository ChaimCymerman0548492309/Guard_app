export const KNOWN_TRACKER_DOMAINS = [
  'doubleclick.net',
  'google-analytics.com',
  'facebook.com',
  'adservice.google.com',
  'scorecardresearch.com',
  'moatads.com',
  'ads.twitter.com',
] as const;

export const TRUSTED_DOMAINS = [
  'google.com',
  'googleapis.com',
  'gstatic.com',
  'apple.com',
  'icloud.com',
] as const;

export const NETWORK_MONITORING = {
  /** Metadata only — never capture payloads */
  collectPayloads: false,
  recordDomains: true,
  recordByteCounts: true,
  recordTimestamps: true,
} as const;
