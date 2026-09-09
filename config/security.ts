export const SECURITY = {
  rateLimitWindowMs: 15 * 60 * 1000,
  rateLimitMax: 100,
  bcryptRounds: 12,
  jwtExpiresIn: '7d',
  helmetEnabled: true,
  corsEnabled: true,
} as const;
