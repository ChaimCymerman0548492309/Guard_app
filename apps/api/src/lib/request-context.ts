import type { Request } from 'express';
import type { AccessContext } from '../lib/data-source.js';

export function accessContext(req: Request): AccessContext {
  return { user: req.user! };
}
