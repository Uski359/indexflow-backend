import createHttpError from 'http-errors';
import { logger } from '../../../infra/config/logger.js';
import { getCampaign } from '../../../config/campaignRegistry.js';
import { evaluatorService } from '../../../services/evaluatorService.js';
export const postCampaignRun = async (req, res, next) => {
    try {
        const body = req.body;
        if (!getCampaign(body.campaign_id)) {
            throw createHttpError(404, `Unknown campaign_id: ${body.campaign_id}`);
        }
        const result = await evaluatorService.runCampaignBatch({
            campaign_id: body.campaign_id,
            window: body.window,
            wallets: body.wallets,
            mode: body.mode,
            as_of_block: body.as_of_block
        });
        res.json(result);
    }
    catch (error) {
        logger.error({ err: error }, 'Failed to run campaign batch');
        next(error);
    }
};
