import { randomUUID } from 'crypto';
import { deleteStake, fetchStakes, insertStake } from '../infra/repositories/stakeRepository.js';
import { createNotFoundError } from '../utils/httpError.js';
export async function listStakes(address) {
    return fetchStakes(address);
}
export async function stakeTokens(request) {
    const lockUntil = new Date(Date.now() + request.lockDays * 24 * 60 * 60 * 1000).toISOString();
    const stake = {
        id: `stake-${randomUUID()}`,
        address: request.address.toLowerCase(),
        amount: request.amount,
        type: request.stakeType,
        apy: calculateApy(request.stakeType, request.lockDays),
        lockUntil,
        rewardsToClaim: 0
    };
    return insertStake(stake);
}
export async function unstakeTokens(stakeId) {
    const stake = await deleteStake(stakeId);
    if (!stake) {
        throw createNotFoundError('Stake', stakeId);
    }
    return stake;
}
function calculateApy(type, lockDays) {
    const base = type === 'active' ? 0.18 : 0.12;
    const lockBonus = Math.min(lockDays / 365, 0.5) * (type === 'active' ? 0.14 : 0.1);
    return Number((Math.min(base + lockBonus, type === 'active' ? 0.32 : 0.22)).toFixed(4));
}
