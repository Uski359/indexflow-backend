import createHttpError from 'http-errors';
import { logger } from '../../../infra/config/logger.js';
import { getCampaign } from '../../../config/campaignRegistry.js';
import { evaluatorService } from '../../../services/evaluatorService.js';
export const getMockWallets = async (req, res, next) => {
    try {
        const params = req.params;
        const query = req.query;
        const campaign_id = params.id;
        if (!getCampaign(campaign_id)) {
            throw createHttpError(404, `Unknown campaign_id: ${campaign_id}`);
        }
        const count = query.count ?? 200;
        const wallets = evaluatorService.generateMockWallets(campaign_id, count);
        res.json(wallets);
    }
    catch (error) {
        logger.error({ err: error }, 'Failed to generate mock wallets');
        next(error);
    }
};
