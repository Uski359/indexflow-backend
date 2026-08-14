import createHttpError from 'http-errors';
import { getRewardSummary, recordRewardClaim, recordRewardDistribution } from '../../../services/rewardService.js';
export async function rewardSummaryHandler(req, res, next) {
    try {
        const summary = await getRewardSummary(req.query.address);
        res.json(summary);
    }
    catch (error) {
        next(error);
    }
}
export async function rewardDistributeHandler(req, res, next) {
    try {
        const event = await recordRewardDistribution(req.body);
        res.status(201).json(event);
    }
    catch (error) {
        next(error);
    }
}
export async function rewardClaimHandler(req, res, next) {
    try {
        const { address } = req.body;
        if (!address) {
            throw createHttpError(400, 'address is required');
        }
        const summary = await recordRewardClaim(address);
        res.json(summary);
    }
    catch (error) {
        next(error);
    }
}
