import { MongoServerError, type Filter } from 'mongodb';

import { logger } from '../logger.js';
import { withRetry } from '../utils/retry.js';
import { getTransfersCollection, type TransferDocument } from './mongo.js';

export interface TransferInput {
  chain: string;
  chainId?: string;
  blockNumber: number;
  txHash: string;
  logIndex: number;
  from: string;
  to: string;
  value: string;
  timestamp?: number | null;
}

const normalizeTimestamp = (timestamp?: number | null): number => {
  if (!timestamp || Number.isNaN(Number(timestamp))) {
    return Date.now();
  }

  const numeric = Number(timestamp);
  const isSeconds = numeric < 10_000_000_000;
  return Math.round(isSeconds ? numeric * 1000 : numeric);
};

const isDuplicateKeyError = (error: unknown): boolean =>
  error instanceof MongoServerError && error.code === 11000;

export const saveTransfer = async (transfer: TransferInput): Promise<void> => {
  const transfers = await getTransfersCollection();
  const chainId = transfer.chainId ?? transfer.chain;
  const filter: Filter<TransferDocument> = {
    txHash: transfer.txHash,
    $or: [
      { chain: chainId, logIndex: transfer.logIndex },
      { chainId, logIndex: transfer.logIndex },
      { chain: chainId, logIndex: { $exists: false } },
      { chainId, logIndex: { $exists: false } }
    ]
  };

  const normalizedTimestamp = normalizeTimestamp(transfer.timestamp);
  const overwritePayload = {
    $set: {
      chain: chainId,
      chainId,
      blockNumber: transfer.blockNumber,
      block: transfer.blockNumber,
      txHash: transfer.txHash,
      logIndex: transfer.logIndex,
      from: transfer.from,
      to: transfer.to,
      value: transfer.value,
      timestamp: normalizedTimestamp
    }
  };

  await withRetry(
    async () => {
      try {
        await transfers.updateOne(
          filter,
          overwritePayload,
          { upsert: true }
        );
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          await transfers
            .updateOne(filter, overwritePayload, { upsert: false })
            .then((result) => {
              if (result.matchedCount === 0) {
                logger.debug('Duplicate transfer overwrite skipped; no match found', {
                  chainId,
                  txHash: transfer.txHash,
                  logIndex: transfer.logIndex
                });
              }
            })
            .catch((updateError) => {
              logger.error('Failed to overwrite duplicate transfer', {
                chainId,
                txHash: transfer.txHash,
                logIndex: transfer.logIndex,
                err: updateError
              });
              throw updateError;
            });
          return;
        }
        throw error;
      }
    },
    {
      taskName: `mongo:transfers:${chainId}:${transfer.txHash}:${transfer.logIndex}`,
      logger,
      baseDelayMs: 300
    }
  );
};
