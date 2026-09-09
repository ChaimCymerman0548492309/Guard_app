import { Router } from 'express';
import { sendSuccess } from '../lib/response.js';

export const openapiRouter: Router = Router();

const OPENAPI_STUB = {
  openapi: '3.0.3',
  info: {
    title: 'Guardian API',
    version: '0.1.0',
    description: 'Local-first security monitoring API',
  },
  paths: {
    '/health': { get: { summary: 'Health check' } },
    '/api/v1/apps': { get: { summary: 'List apps with risk levels' } },
    '/api/v1/apps/{id}': { get: { summary: 'Get app details' } },
    '/api/v1/dashboard/summary': { get: { summary: 'Dashboard summary' } },
  },
};

openapiRouter.get('/', (req, res) => {
  sendSuccess(res, OPENAPI_STUB, req.requestId);
});
