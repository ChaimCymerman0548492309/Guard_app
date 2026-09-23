import rateLimit from 'express-rate-limit';
export const deviceRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    typeof req.headers['x-device-id'] === 'string'
      ? `device:${req.headers['x-device-id']}`
      : `ip:${req.ip ?? 'unknown'}`,
});
