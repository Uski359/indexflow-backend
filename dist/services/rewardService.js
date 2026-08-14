import { randomUUID } from 'crypto';
import createHttpError from 'http-errors';
import { getDatasetById } from '../infra/repositories/datasetRepository.js';
import { fetchRecentRewardEvents, insertRewardEvent, sumRewardEvents } from '../infra/repositories/rewardRepository.js';
import { clearRewardsForAddress, sumRewards } from '../infra/repositories/stakeRepository.js';
import { createNotFoundError } from '../utils/httpError.js';
export async function recordRewardDistribution(input) {
    const dataset = await getDatasetById(input.datasetId);
    if (!dataset) {
        throw createNotFoundError('Dataset', input.datasetId);
    }
    if (dataset.status !== 'indexed') {
        throw createHttpError(409, 'Dataset must be indexed before rewards are disbursed');
    }
    const event = {
        id: `reward-${randomUUID()}`,
        datasetId: input.datasetId,
        recipient: input.recipient.toLowerCase(),
        amount: input.amount,
        createdAt: input.timestamp ?? new Date().toISOString()
    };
    return insertRewardEvent(event);
}
export async function recordRewardClaim(address) {
    const normalized = address.toLowerCase();
    await clearRewardsForAddress(normalized);
    return getRewardSummary(normalized);
}
export async function getRewardSummary(address) {
    const normalizedAddress = address?.toLowerCase();
    const [pending, lifetime, recentEvents] = await Promise.all([
        sumRewards(normalizedAddress),
        sumRewardEvents(normalizedAddress),
        fetchRecentRewardEvents(normalizedAddress)
    ]);
    return {
        address: normalizedAddress ?? 'network',
        pending,
        lifetime,
        latestDistributions: recentEvents.map((event) => ({
            datasetId: event.datasetId,
            amount: event.amount,
            timestamp: event.createdAt
        }))
    };
}
