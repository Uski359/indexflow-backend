import { getContributionsCollection } from '../../../infra/indexer/db/mongo.js';
const mapContribution = (doc) => ({
    chain: doc.chain,
    user: doc.user,
    contributionType: doc.contributionType,
    weight: doc.weight,
    timestamp: doc.timestamp,
    txHash: doc.txHash,
    block: doc.block
});
export class ContributionsService {
    static async getUserContributions(address, chain) {
        const collection = await getContributionsCollection();
        const match = { user: address };
        if (chain) {
            match.chain = chain;
        }
        const docs = await collection
            .find(match)
            .sort({ block: -1, _id: -1 })
            .limit(100)
            .toArray();
        return docs.map(mapContribution);
    }
    static async getLeaderboard(limit = 20) {
        const collection = await getContributionsCollection();
        const pipeline = [
            { $group: { _id: '$user', totalWeight: { $sum: { $toDouble: '$weight' } } } },
            { $sort: { totalWeight: -1 } },
            { $limit: limit },
            { $project: { _id: 0, user: '$_id', totalWeight: { $toString: '$totalWeight' } } }
        ];
        const docs = await collection.aggregate(pipeline).toArray();
        return docs;
    }
}
