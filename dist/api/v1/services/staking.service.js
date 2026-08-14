import { getStakingEventsCollection } from '../../../infra/indexer/db/mongo.js';
const ZERO_STATS = {
    totalStaked: '0',
    totalUnstaked: '0',
    netStaked: '0',
    totalRewardsClaimed: '0'
};
const toBigInt = (value) => BigInt(value);
export class StakingService {
    static async getUserStakingInfo(address, chain) {
        const collection = await getStakingEventsCollection();
        const match = { user: address };
        if (chain) {
            match.chain = chain;
        }
        const events = await collection.find(match).toArray();
        if (!events.length) {
            return ZERO_STATS;
        }
        let totalStaked = 0n;
        let totalUnstaked = 0n;
        let totalRewardsClaimed = 0n;
        for (const event of events) {
            const amount = toBigInt(event.amount);
            if (event.eventType === 'STAKED') {
                totalStaked += amount;
            }
            else if (event.eventType === 'UNSTAKED') {
                totalUnstaked += amount;
            }
            else if (event.eventType === 'REWARD_CLAIMED') {
                totalRewardsClaimed += amount;
            }
        }
        const netStaked = totalStaked - totalUnstaked;
        return {
            totalStaked: totalStaked.toString(),
            totalUnstaked: totalUnstaked.toString(),
            netStaked: netStaked.toString(),
            totalRewardsClaimed: totalRewardsClaimed.toString()
        };
    }
    static async getGlobalStakingStats(chain) {
        const collection = await getStakingEventsCollection();
        const match = {};
        if (chain) {
            match.chain = chain;
        }
        const events = await collection.find(match).toArray();
        const stakers = await collection.distinct('user', match);
        let totalStaked = 0n;
        let totalUnstaked = 0n;
        let totalRewards = 0n;
        for (const event of events) {
            const amount = toBigInt(event.amount);
            if (event.eventType === 'STAKED') {
                totalStaked += amount;
            }
            else if (event.eventType === 'UNSTAKED') {
                totalUnstaked += amount;
            }
            else if (event.eventType === 'REWARD_CLAIMED') {
                totalRewards += amount;
            }
        }
        return {
            totalStakers: stakers.length,
            totalStaked: totalStaked.toString(),
            totalRewardsDistributed: totalRewards.toString(),
            netStaked: (totalStaked - totalUnstaked).toString()
        };
    }
}
