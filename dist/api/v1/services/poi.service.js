import { getPoiEventsCollection } from '../../../infra/indexer/db/mongo.js';
const mapProof = (doc) => ({
    chain: doc.chain,
    operator: doc.operator,
    chainId: doc.chainId,
    fromBlock: doc.fromBlock,
    toBlock: doc.toBlock,
    proofHash: doc.proofHash,
    timestamp: doc.timestamp,
    block: doc.block,
    txHash: doc.txHash
});
export class PoiService {
    static async getOperatorProofs(address, chain) {
        const collection = await getPoiEventsCollection();
        const match = { operator: address };
        if (chain) {
            match.chain = chain;
        }
        const docs = await collection
            .find(match)
            .sort({ block: -1, _id: -1 })
            .limit(50)
            .toArray();
        return docs.map(mapProof);
    }
    static async getRecentProofs(chain) {
        const collection = await getPoiEventsCollection();
        const match = {};
        if (chain) {
            match.chain = chain;
        }
        const docs = await collection
            .find(match)
            .sort({ block: -1, _id: -1 })
            .limit(50)
            .toArray();
        return docs.map(mapProof);
    }
}
