import { logger } from '../../../infra/config/logger.js';
import { evaluateProofOfUsage } from '../services/proofOfUsage.service.js';
const isRecord = (value) => value !== null && typeof value === 'object';
const parseNumber = (value) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const parseCriteria = (value) => {
    if (!isRecord(value))
        return undefined;
    const timeframeDays = parseNumber(value.timeframeDays);
    const minimumInteractions = parseNumber(value.minimumInteractions);
    const minimumActiveDays = parseNumber(value.minimumActiveDays);
    const criteria = {};
    if (timeframeDays !== undefined) {
        criteria.timeframeDays = timeframeDays;
    }
    if (minimumInteractions !== undefined) {
        criteria.minimumInteractions = minimumInteractions;
    }
    if (minimumActiveDays !== undefined) {
        criteria.minimumActiveDays = minimumActiveDays;
    }
    return Object.keys(criteria).length ? criteria : undefined;
};
export const postProofOfUsage = async (req, res, next) => {
    try {
        const body = isRecord(req.body) ? req.body : {};
        const wallet = body.wallet;
        if (typeof wallet !== 'string' || wallet.trim().length === 0) {
            res.status(400).json({ error: 'Wallet is required.' });
            return;
        }
        const criteria = parseCriteria(body.criteria);
        const result = await evaluateProofOfUsage(wallet, criteria);
        res.json(result);
    }
    catch (error) {
        logger.error({ err: error }, 'Failed to evaluate proof-of-usage');
        next(error);
    }
};
