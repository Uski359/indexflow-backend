import { connectDB } from '../../../infra/indexer/db/mongo.js';
const TRANSFERS_COLLECTION = 'transfers';
const DEFAULT_CHAIN = 'sepolia';
export class HoldersService {
    static async getHolderCount(chain) {
        const db = await connectDB();
        const transfers = db.collection(TRANSFERS_COLLECTION);
        const chainId = chain || DEFAULT_CHAIN;
        const [result] = await transfers
            .aggregate([
            { $match: { chain: chainId } },
            {
                $group: {
                    _id: null,
                    holders: { $addToSet: '$to' },
                    senders: { $addToSet: '$from' }
                }
            },
            {
                $project: {
                    total: { $size: { $setUnion: ['$holders', '$senders'] } }
                }
            }
        ])
            .toArray();
        return result?.total ?? 0;
    }
}
