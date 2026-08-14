import { logger } from '../../../infra/config/logger.js';
import { evaluatorService } from '../../../services/evaluatorService.js';
export const postEvaluate = async (req, res, next) => {
    try {
        const body = req.body;
        const result = await evaluatorService.evaluateWallet({
            wallet: body.wallet,
            campaign_id: body.campaign_id,
            window: body.window,
            as_of_block: body.as_of_block
        });
        res.json({
            output: result.output,
            cached: result.cached,
            meta: result.meta
        });
    }
    catch (error) {
        logger.error({ err: error }, 'Failed to evaluate usage');
        next(error);
    }
};
