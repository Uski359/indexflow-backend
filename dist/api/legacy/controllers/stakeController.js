import { listStakes, stakeTokens, unstakeTokens } from '../../../services/stakeService.js';
export async function listStakesHandler(req, res, next) {
    try {
        const address = typeof req.query.address === 'string' ? req.query.address : undefined;
        const items = await listStakes(address);
        res.json({ items });
    }
    catch (error) {
        next(error);
    }
}
export async function stakeHandler(req, res, next) {
    try {
        const stake = await stakeTokens(req.body);
        res.status(201).json(stake);
    }
    catch (error) {
        next(error);
    }
}
export async function unstakeHandler(req, res, next) {
    try {
        const { stakeId } = req.body;
        const stake = await unstakeTokens(stakeId);
        res.json({ stake });
    }
    catch (error) {
        next(error);
    }
}
