import { Router } from 'express';
import { sendSuccess } from '../lib/response.js';

export const healthRouter: Router = Router();

healthRouter.get('/', (req, res) => {
  sendSuccess(res, { status: 'ok', version: '0.1.0' }, req.requestId);
});
