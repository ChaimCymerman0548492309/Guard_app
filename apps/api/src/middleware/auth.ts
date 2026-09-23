import type { NextFunction, Request, Response } from 'express';
import { UserRole } from '@guardian/shared';
import { verifyAccessToken } from '../lib/auth.js';
import { sendError } from '../lib/response.js';

export function authenticate(required = true) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined;

    if (!token) {
      if (required) {
        sendError(res, 'UNAUTHORIZED', 'Authentication required', req.requestId, 401);
        return;
      }
      next();
      return;
    }

    const user = verifyAccessToken(token);
    if (!user) {
      sendError(res, 'UNAUTHORIZED', 'Invalid or expired token', req.requestId, 401);
      return;
    }

    req.user = user;
    next();
  };
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', req.requestId, 401);
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, 'FORBIDDEN', 'Insufficient permissions', req.requestId, 403);
      return;
    }
    next();
  };
}
