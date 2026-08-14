import createHttpError from 'http-errors';
import { logger } from '../../../infra/config/logger.js';
import { getCampaign } from '../../../config/campaignRegistry.js';
import { insightsService } from '../../../services/insightsService.js';
export const postInsights = (req, res, next) => {
    try {
        const body = req.body;
        const result = insightsService.computeInsight(body.output);
        res.json({
            insights: result.insights,
            cached: result.cached
        });
    }
    catch (error) {
        logger.error({ err: error }, 'Failed to compute insights');
        next(error);
    }
};
export const postCampaignInsights = async (req, res, next) => {
    try {
        const body = req.body;
        if (!getCampaign(body.campaign_id)) {
            throw createHttpError(404, `Unknown campaign_id: ${body.campaign_id}`);
        }
        const result = await insightsService.runCampaignInsights({
            campaign_id: body.campaign_id,
            window: body.window,
            wallets: body.wallets,
            mode: body.mode,
            as_of_block: body.as_of_block
        });
        res.json(result);
    }
    catch (error) {
        logger.error({ err: error }, 'Failed to run campaign insights');
        next(error);
    }
};
