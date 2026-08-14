import { MongoServerError } from 'mongodb';
import { logger } from '../logger.js';
import { withRetry } from '../utils/retry.js';
import { getTransfersCollection } from './mongo.js';
const normalizeTimestamp = (timestamp) => {
    if (!timestamp || Number.isNaN(Number(timestamp))) {
        return Date.now();
    }
    const numeric = Number(timestamp);
    const isSeconds = numeric < 10000000000;
    return Math.round(isSeconds ? numeric * 1000 : numeric);
};
const normalizeAddress = (value) => {
    if (!value) {
        return undefined;
    }
    return value.trim().toLowerCase();
};
const isDuplicateKeyError = (error) => error instanceof MongoServerError && error.code === 11000;
export const saveTransfer = async (transfer) => {
    const transfers = await getTransfersCollection();
    const chainId = (transfer.chainId ?? transfer.chain).trim().toLowerCase();
    const from = normalizeAddress(transfer.from) ?? transfer.from;
    const to = normalizeAddress(transfer.to) ?? transfer.to;
    const contractAddress = normalizeAddress(transfer.contractAddress);
    const filter = {
        txHash: transfer.txHash,
        $or: [
            { chain: chainId, logIndex: transfer.logIndex },
            { chainId, logIndex: transfer.logIndex },
            { chain: chainId, logIndex: { $exists: false } },
            { chainId, logIndex: { $exists: false } }
        ]
    };
    const normalizedTimestamp = normalizeTimestamp(transfer.timestamp);
    await withRetry(async () => {
        try {
            await transfers.updateOne(filter, {
                $set: {
                    chain: chainId,
                    chainId,
                    blockNumber: transfer.blockNumber,
                    block: transfer.blockNumber,
                    txHash: transfer.txHash,
                    logIndex: transfer.logIndex,
                    from,
                    to,
                    value: transfer.value,
                    timestamp: normalizedTimestamp,
                    contractAddress,
                    contract_address: contractAddress
                }
            }, { upsert: true });
        }
        catch (error) {
            if (isDuplicateKeyError(error)) {
                logger.debug('Duplicate transfer ignored', {
                    chainId,
                    txHash: transfer.txHash,
                    logIndex: transfer.logIndex
                });
                return;
            }
            throw error;
        }
    }, {
        taskName: `mongo:transfers:${transfer.chain}:${transfer.txHash}:${transfer.logIndex}`,
        logger,
        baseDelayMs: 300
    });
};
