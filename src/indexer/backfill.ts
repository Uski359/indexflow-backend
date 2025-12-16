import './env.js';

import { loadLastProcessedBlock, persistLastProcessedBlock } from './db/state.js';
import { logger } from './logger.js';
import { createBlockProcessor } from './listener/runListener.js';
import { obfuscateRpcUrl } from './services/provider.js';

type ToArg = number | 'latest' | undefined;
interface CliArgs {
  chain: string;
  from?: number;
  to?: ToArg;
}

const BACKFILL_BATCH_SIZE = Math.max(1, Number(process.env.INDEXER_BATCH_SIZE ?? '25'));
const REORG_DEPTH = Math.max(0, Number(process.env.REORG_DEPTH ?? '6'));

const parseOptionalNumber = (value?: string): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseArgs = (): CliArgs => {
  const argv = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }

    const key = arg.slice(2);
    const value = argv[i + 1];
    if (value && !value.startsWith('--')) {
      parsed[key] = value;
      i += 1;
    }
  }

  const chain = parsed.chain ?? '';
  const from = parseOptionalNumber(parsed.from);
  const rawTo = parsed.to;
  const to: ToArg =
    rawTo === 'latest' ? 'latest' : rawTo !== undefined ? parseOptionalNumber(rawTo) : undefined;

  if (parsed.from !== undefined && from === undefined) {
    throw new Error(`Invalid --from value: ${parsed.from}`);
  }
  if (parsed.to !== undefined && to === undefined) {
    throw new Error(`Invalid --to value: ${parsed.to}`);
  }

  return { chain, from, to };
};

const run = async (): Promise<void> => {
  const { chain: chainId, from, to } = parseArgs();
  if (!chainId) {
    throw new Error('Missing required --chain argument');
  }

  const { chain, provider, startBlock, processBlock } = await createBlockProcessor(chainId);
  const persisted = await loadLastProcessedBlock(chain.id);

  const fromBlock =
    from !== undefined
      ? Math.max(startBlock, from)
      : Math.max(startBlock, persisted !== null ? persisted - REORG_DEPTH : startBlock);
  const latestBlock = await provider.getBlockNumber();
  const toBlockCandidate =
    to === undefined || to === 'latest' ? Number(latestBlock) : Math.trunc(to);
  const toBlock = Math.max(toBlockCandidate, fromBlock);

  logger.info('Starting manual backfill', {
    chainId: chain.id,
    rpc: obfuscateRpcUrl(provider.rpcUrl),
    fromBlock,
    toBlock,
    batchSize: BACKFILL_BATCH_SIZE,
    reorgDepth: REORG_DEPTH,
    resumeFromState: persisted ?? undefined
  });

  if (fromBlock > toBlock) {
    logger.info('Backfill range already processed', { chainId: chain.id, fromBlock, toBlock });
    return;
  }

  let processed = 0;
  let batchStart = fromBlock;
  let lastPersistedBlock = fromBlock - 1;

  for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber += 1) {
    // eslint-disable-next-line no-await-in-loop
    await processBlock(blockNumber);
    processed += 1;
    lastPersistedBlock = blockNumber;

    const shouldPersist =
      processed % BACKFILL_BATCH_SIZE === 0 || blockNumber === toBlock || processed === 1;
    if (shouldPersist) {
      // eslint-disable-next-line no-await-in-loop
      await persistLastProcessedBlock(chain.id, lastPersistedBlock, toBlock);
      logger.info('Backfill progress', {
        chainId: chain.id,
        fromBlock: batchStart,
        toBlock: blockNumber,
        processed
      });
      batchStart = blockNumber + 1;
    }
  }

  logger.info('Manual backfill completed', {
    chainId: chain.id,
    fromBlock,
    toBlock,
    processedBlocks: processed
  });
};

run().catch((error) => {
  logger.error('Manual backfill failed', { err: error });
  process.exit(1);
});
