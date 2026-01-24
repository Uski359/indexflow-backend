import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../config/logger.js';
import type { UsageOutputV1 } from '../../core/contracts/usageOutputV1.js';
import type { UsageWindowInput } from '../../core/evaluator/evaluateUsageV1.js';
import { insightsService } from '../../services/insightsService.js';

export const postInsights = (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as {
      output: UsageOutputV1;
    };

    const result = insightsService.computeInsight(body.output);

    res.json({
      insights: result.insights,
      cached: result.cached
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to compute insights');
    next(error);
  }
};

export const postCampaignInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const body = req.body as {
      campaign_id: string;
      window: UsageWindowInput;
      wallets: string[];
      mode: 'sync';
    };

    const result = await insightsService.runCampaignInsights({
      campaign_id: body.campaign_id,
      window: body.window,
      wallets: body.wallets,
      mode: body.mode
    });

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Failed to run campaign insights');
    next(error);
  }
};
