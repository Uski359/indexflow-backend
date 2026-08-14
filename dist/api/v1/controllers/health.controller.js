import { logger } from '../../../infra/config/logger.js';
import { HealthService } from '../services/health.service.js';
export const getIndexerHealth = async (req, res, next) => {
    try {
        const chain = req.query.chain || undefined;
        const data = await HealthService.getHealth(chain);
        res.json({ success: true, data });
    }
    catch (error) {
        logger.error({ err: error }, 'Failed to fetch indexer health');
        next(error);
    }
};
