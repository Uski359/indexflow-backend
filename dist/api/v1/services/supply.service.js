import { connectDB } from '../../../infra/indexer/db/mongo.js';
const TRANSFERS_COLLECTION = 'transfers';
const DEFAULT_CHAIN = 'sepolia';
export class SupplyService {
    static async getTotalSupply(chain) {
        const db = await connectDB();
        const transfers = db.collection(TRANSFERS_COLLECTION);
        const chainId = chain || DEFAULT_CHAIN;
        const [result] = await transfers
            .aggregate([
            { $match: { chain: chainId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $toDouble: '$value' } }
                }
            }
        ])
            .toArray();
        return result?.total ?? 0;
    }
}
