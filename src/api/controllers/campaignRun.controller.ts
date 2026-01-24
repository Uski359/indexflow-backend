import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../config/logger.js';
import type { UsageWindowInput } from '../../core/evaluator/evaluateUsageV1.js';
import { evaluatorService } from '../../services/evaluatorService.js';

export const postCampaignRun = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as {
      campaign_id: string;
      window: UsageWindowInput;
      wallets: string[];
      mode: 'sync';
    };

    const result = await evaluatorService.runCampaignBatch({
      campaign_id: body.campaign_id,
      window: body.window,
      wallets: body.wallets,
      mode: body.mode
    });

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Failed to run campaign batch');
    next(error);
  }
};
