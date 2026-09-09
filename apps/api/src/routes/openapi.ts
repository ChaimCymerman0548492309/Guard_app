import { Router } from 'express';
import { sendSuccess } from '../lib/response.js';
import { OPENAPI_SPEC } from '../lib/openapi-spec.js';

export const openapiRouter: Router = Router();

openapiRouter.get('/', (req, res) => {
  sendSuccess(res, OPENAPI_SPEC, req.requestId);
});
