import { logger } from '../../../infra/config/logger.js';
import { HoldersService } from '../services/holders.service.js';
export const getHolders = async (req, res, next) => {
    try {
        const chain = req.query.chain || undefined;
        const totalHolders = await HoldersService.getHolderCount(chain);
        res.json({ success: true, data: { totalHolders } });
    }
    catch (error) {
        logger.error({ err: error }, 'Failed to fetch holders');
        next(error);
    }
};
