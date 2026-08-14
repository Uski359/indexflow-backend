import { MongoClient } from 'mongodb';
import { logger } from '../logger.js';
import { withRetry } from '../utils/retry.js';
const mongoUri = process.env.MONGO_URL ?? process.env.MONGO_URI ?? 'mongodb://localhost:27017/indexflow';
const mongoDbName = process.env.MONGO_DB ?? 'indexflow';
const obfuscatedUri = mongoUri.replace(/\/\/.+@/u, '//***:***@');
let client;
let dbPromise;
export const connectDB = async () => {
    if (dbPromise) {
        return dbPromise;
    }
    client = new MongoClient(mongoUri);
    dbPromise = withRetry(async () => {
        await client?.connect();
        logger.info('Connected to MongoDB', { host: obfuscatedUri });
        return client.db(mongoDbName);
    }, { taskName: 'mongo:connect', logger, baseDelayMs: 250 });
    return dbPromise;
};
let transfersCollectionPromise = null;
export const getTransfersCollection = async () => {
    if (!transfersCollectionPromise) {
        transfersCollectionPromise = connectDB().then(async (db) => {
            const collection = db.collection('transfers');
            await collection.createIndex({ chainId: 1, txHash: 1, logIndex: 1 }, {
                name: 'transfer_chainId_tx_log_unique',
                unique: true,
                partialFilterExpression: { chainId: { $exists: true }, logIndex: { $exists: true } }
            });
            await collection.createIndex({ chainId: 1, contractAddress: 1, timestamp: 1, from: 1 }, { name: 'transfer_metrics_from_idx' });
            await collection.createIndex({ chainId: 1, contractAddress: 1, timestamp: 1, to: 1 }, { name: 'transfer_metrics_to_idx' });
            return collection;
        });
    }
    return transfersCollectionPromise;
};
export const getStakingEventsCollection = async () => {
    const db = await connectDB();
    return db.collection('staking_events');
};
export const getPoiEventsCollection = async () => {
    const db = await connectDB();
    return db.collection('poi_events');
};
export const getContributionsCollection = async () => {
    const db = await connectDB();
    return db.collection('contributions');
};
