import type { Response } from 'express';
import type { ApiResponse, ApiErrorResponse } from '@guardian/shared';

export function sendSuccess<T>(res: Response, data: T, requestId: string, status = 200): void {
  const body: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
  res.status(status).json(body);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  requestId: string,
  status = 400,
): void {
  const body: ApiErrorResponse = {
    success: false,
    error: { code, message },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
  res.status(status).json(body);
}
