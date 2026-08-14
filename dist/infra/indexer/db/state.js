import { connectDB } from './mongo.js';
let stateCollectionPromise = null;
const getStateCollection = async () => {
    if (!stateCollectionPromise) {
        stateCollectionPromise = connectDB().then(async (db) => {
            const collection = db.collection('indexer_state');
            await collection.createIndex({ chainId: 1 }, { unique: true });
            return collection;
        });
    }
    return stateCollectionPromise;
};
export const loadLastProcessedBlock = async (chainId) => {
    const collection = await getStateCollection();
    const doc = await collection.findOne({ chainId: `${chainId}` });
    return doc?.lastProcessedBlock ?? null;
};
export const persistLastProcessedBlock = async (chainId, blockNumber, currentChainBlock) => {
    const collection = await getStateCollection();
    const stateUpdate = {
        chainId: `${chainId}`,
        lastProcessedBlock: blockNumber,
        updatedAt: new Date()
    };
    if (currentChainBlock !== undefined) {
        stateUpdate.currentChainBlock = currentChainBlock;
    }
    await collection.updateOne({ chainId: `${chainId}` }, { $set: stateUpdate }, { upsert: true });
};
