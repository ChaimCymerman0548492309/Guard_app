import { Router } from 'express';
import { lookupDomainReputation } from '@guardian/shared';
import { sendError, sendSuccess } from '../lib/response.js';

export const domainsRouter: Router = Router();

domainsRouter.get('/:domain/reputation', (req, res) => {
  const domain = decodeURIComponent(req.params.domain).trim().toLowerCase();

  if (!domain || domain.length > 253) {
    sendError(res, 'INVALID_DOMAIN', 'Invalid domain name', req.requestId, 400);
    return;
  }

  const reputation = lookupDomainReputation(domain);

  if (!reputation) {
    sendSuccess(
      res,
      {
        domain,
        isTracker: false,
        category: 'unknown',
        reputationScore: 50,
      },
      req.requestId,
    );
    return;
  }

  sendSuccess(res, reputation, req.requestId);
});
