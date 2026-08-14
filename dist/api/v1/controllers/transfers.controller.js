import { logger } from '../../../infra/config/logger.js';
import { TransfersService } from '../services/transfers.service.js';
export const getLatestTransfers = async (req, res, next) => {
    try {
        const chain = req.query.chain || undefined;
        const data = await TransfersService.getLatest(chain);
        res.json({ success: true, data });
    }
    catch (error) {
        logger.error({ err: error }, 'Failed to fetch latest transfers');
        next(error);
    }
};
export const getAddressTransfers = async (req, res, next) => {
    try {
        const { address } = req.params;
        const chain = req.query.chain || undefined;
        const data = await TransfersService.getByAddress(address, chain);
        res.json({ success: true, data });
    }
    catch (error) {
        logger.error({ err: error, address: req.params.address }, 'Failed to fetch transfers for address');
        next(error);
    }
};
