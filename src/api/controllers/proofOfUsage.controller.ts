import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../config/logger.js';
import { ProofOfUsageService } from '../services/proofOfUsage.service.js';

export const postProofOfUsage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wallet = typeof req.body?.wallet === 'string' ? req.body.wallet.trim() : '';
    if (!wallet) {
      res.status(400).json({ success: false, error: 'wallet is required' });
      return;
    }

    const data = await ProofOfUsageService.evaluate(wallet, req.body?.criteria);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Failed to evaluate proof of usage');
    next(error);
  }
};
