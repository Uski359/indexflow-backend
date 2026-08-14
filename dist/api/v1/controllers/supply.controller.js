import { logger } from '../../../infra/config/logger.js';
import { SupplyService } from '../services/supply.service.js';
export const getSupply = async (req, res, next) => {
    try {
        const chain = req.query.chain || undefined;
        const totalSupply = await SupplyService.getTotalSupply(chain);
        res.json({ success: true, data: { totalSupply } });
    }
    catch (error) {
        logger.error({ err: error }, 'Failed to fetch total supply');
        next(error);
    }
};
