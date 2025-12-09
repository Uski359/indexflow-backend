import '../env.js';

import { Contract, JsonRpcProvider, getAddress, isError, type EventLog } from 'ethers';
import { MongoClient, type Collection } from 'mongodb';
import pino from 'pino';

import { TransferSchema, type Transfer } from '../../schema/transferSchema.js';

const ERC20_ABI = ['event Transfer(address indexed from, address indexed to, uint256 value)'];
const DEFAULT_TOKEN_ADDRESS = '0x93b95f6956330f4a56e7a94457a7e597a7340e61';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { module: 'indexer', chain: 'sepolia' }
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const obfuscateRpcUrl = (url: string): string => url.replace(/(https?:\/\/)([^@]+)@/u, '$1***@');

const isRateLimitError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  const status = (error as { status?: unknown }).status;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  const message = (error as { message?: string }).message?.toLowerCase() ?? '';

  if (code === 429 || status === 429 || statusCode === 429) {
    return true;
  }

  return message.includes('rate limit') || message.includes('too many request') || message.includes('429');
};

class MultiRpcProvider {
  private readonly rpcUrls: string[];
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly backoffFactor: number;
  private readonly maxAttempts: number;

  private currentIndex = 0;
  private provider: JsonRpcProvider;
  private readonly rotationHandlers: Array<(provider: JsonRpcProvider) => void> = [];

  constructor(
    rpcUrls: string[],
    private readonly log = logger,
    {
      baseDelayMs = 500,
      maxDelayMs = 10_000,
      backoffFactor = 2,
      maxAttempts = 5
    }: {
      baseDelayMs?: number;
      maxDelayMs?: number;
      backoffFactor?: number;
      maxAttempts?: number;
    } = {}
  ) {
    if (rpcUrls.length === 0) {
      throw new Error('No RPC URLs provided');
    }

    this.rpcUrls = rpcUrls;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.backoffFactor = backoffFactor;
    this.maxAttempts = maxAttempts;
    this.provider = this.createProvider(this.rpcUrls[this.currentIndex]);
  }

  getProvider(): JsonRpcProvider {
    return this.provider;
  }

  getCurrentRpc(): string {
    return this.rpcUrls[this.currentIndex];
  }

  onProviderChange(handler: (provider: JsonRpcProvider) => void): void {
    this.rotationHandlers.push(handler);
  }

  async getChainId(): Promise<string> {
    const network = await this.callWithRetry('getNetwork', (p) => p.getNetwork());
    return network.chainId.toString();
  }

  rotateProvider(reason?: unknown): JsonRpcProvider {
    this.currentIndex = (this.currentIndex + 1) % this.rpcUrls.length;
    const nextUrl = this.rpcUrls[this.currentIndex];
    this.provider = this.createProvider(nextUrl);
    this.log.warn(
      {
        rpc: obfuscateRpcUrl(nextUrl),
        reason: reason instanceof Error ? reason.message : reason ?? 'unknown'
      },
      'Rotated RPC provider'
    );
    this.rotationHandlers.forEach((handler) => handler(this.provider));
    return this.provider;
  }

  async callWithRetry<T>(
    taskName: string,
    fn: (provider: JsonRpcProvider) => Promise<T>
  ): Promise<T> {
    let attempt = 0;
    let delayMs = this.baseDelayMs;
    let lastError: unknown;

    while (attempt < this.maxAttempts) {
      const provider = this.getProvider();
      try {
        const result = await fn(provider);
        if (attempt > 0) {
          this.log.info(
            { taskName, attempt: attempt + 1, rpc: obfuscateRpcUrl(this.getCurrentRpc()) },
            'Recovered after RPC retry'
          );
        }
        return result;
      } catch (error) {
        lastError = error;
        const rateLimited = isRateLimitError(error);
        const shouldRotate =
          rateLimited ||
          isError(error, 'NETWORK_ERROR') ||
          isError(error, 'SERVER_ERROR') ||
          isError(error, 'TIMEOUT');

        this.log.error(
          {
            taskName,
            attempt: attempt + 1,
            rpc: obfuscateRpcUrl(this.getCurrentRpc()),
            rateLimited,
            err: error
          },
          'RPC call failed'
        );

        if (shouldRotate) {
          this.rotateProvider(error);
        }

        attempt += 1;
        await sleep(delayMs);
        delayMs = Math.min(this.maxDelayMs, delayMs * this.backoffFactor);
      }
    }

    this.log.error(
      { taskName, attempts: this.maxAttempts, err: lastError },
      'RPC call exhausted retries'
    );
    throw lastError instanceof Error ? lastError : new Error('RPC call failed');
  }

  private createProvider(url: string): JsonRpcProvider {
    const provider = new JsonRpcProvider(url);
    provider.on('error' as unknown as string, (error) => {
      this.log.error(
        { err: error, rpc: obfuscateRpcUrl(url) },
        'Provider emitted an error; rotating'
      );
      this.rotateProvider(error);
    });
    return provider;
  }
}

class TransferRepository {
  private client: MongoClient;
  private collection?: Collection<Transfer>;
  private connected = false;

  constructor(
    private readonly uri: string,
    private readonly dbName: string,
    private readonly log = logger
  ) {
    this.client = new MongoClient(uri);
  }

  private async getCollection(): Promise<Collection<Transfer>> {
    if (!this.connected) {
      await this.client.connect();
      this.collection = this.client.db(this.dbName).collection<Transfer>('transfers');
      this.connected = true;
      this.log.info({ db: this.dbName }, 'Connected to MongoDB for transfers');
    }

    return this.collection!;
  }

  async insert(transfer: Transfer): Promise<void> {
    const collection = await this.getCollection();
    await collection.insertOne(transfer);
  }
}

const loadRpcUrls = (): string[] =>
  [process.env.SEPOLIA_RPC_1, process.env.SEPOLIA_RPC_2, process.env.SEPOLIA_RPC_3]
    .filter((url): url is string => typeof url === 'string' && url.length > 0)
    .map((url) => url.trim());

const resolveTokenAddress = (): string | null => {
  const configured = process.env.SEPOLIA_TOKEN_ADDRESS ?? DEFAULT_TOKEN_ADDRESS;
  try {
    return getAddress(configured);
  } catch (error) {
    logger.error({ err: error, tokenAddress: configured }, 'Invalid token address');
    return null;
  }
};

export const startListener = async (): Promise<void> => {
  const rpcUrls = loadRpcUrls();
  const tokenAddress = resolveTokenAddress();
  const mongoUri =
    process.env.MONGO_URL ?? process.env.MONGO_URI ?? 'mongodb://localhost:27017/indexflow';
  const mongoDbName = process.env.MONGO_DB ?? 'indexflow';

  if (!tokenAddress) {
    logger.error('Token address not configured; listener will not start');
    return;
  }

  if (rpcUrls.length === 0) {
    logger.error('No RPC URLs configured for Sepolia; set SEPOLIA_RPC_1/2/3');
    return;
  }

  const multiProvider = new MultiRpcProvider(rpcUrls, logger);
  const repository = new TransferRepository(mongoUri, mongoDbName, logger);
  let chainId = process.env.SEPOLIA_CHAIN_ID;

  if (!chainId) {
    chainId = await multiProvider
      .getChainId()
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Failed to resolve chainId from provider');
        return null;
      })
      .then((resolved) => resolved ?? '11155111');
  }

  let contract: Contract | null = null;

  const handleTransfer = async (
    from: string,
    to: string,
    value: bigint,
    event: EventLog
  ): Promise<void> => {
    try {
      const blockNumber = Number(event.blockNumber);
      const txHash = event.transactionHash;

      const block = await multiProvider
        .callWithRetry('getBlock', (provider) => provider.getBlock(blockNumber))
        .catch((error: unknown) => {
          logger.error(
            { err: error, blockNumber, txHash },
            'Failed to fetch block for timestamp; skipping event'
          );
          return null;
        });

      if (!block) {
        return;
      }

      const transfer: Transfer = {
        chainId: chainId!,
        blockNumber,
        txHash,
        from: getAddress(from),
        to: getAddress(to),
        amount: value.toString(),
        timestamp: Number(block.timestamp)
      };

      const parsed = TransferSchema.safeParse(transfer);
      if (!parsed.success) {
        logger.error(
          { txHash, blockNumber, issues: parsed.error.issues },
          'Transfer validation failed'
        );
        return;
      }

      await repository.insert(parsed.data);
      logger.info(
        {
          txHash,
          blockNumber,
          from: parsed.data.from,
          to: parsed.data.to,
          amount: parsed.data.amount
        },
        'Stored transfer event'
      );
    } catch (error) {
      logger.error({ err: error }, 'Unhandled error while processing transfer event');
    }
  };

  const bindListener = (provider: JsonRpcProvider): void => {
    if (contract) {
      contract.removeAllListeners();
    }
    contract = new Contract(tokenAddress, ERC20_ABI, provider);
    contract.on('Transfer', handleTransfer);

    logger.info(
      { rpc: obfuscateRpcUrl(multiProvider.getCurrentRpc()), token: tokenAddress },
      'Listening for Transfer events'
    );
  };

  multiProvider.onProviderChange((provider) => {
    logger.info(
      { rpc: obfuscateRpcUrl(multiProvider.getCurrentRpc()) },
      'Rebinding contract listener after RPC rotation'
    );
    bindListener(provider);
  });

  bindListener(multiProvider.getProvider());
};

void startListener().catch((error: unknown) => {
  logger.error({ err: error }, 'Failed to start Sepolia listener');
});
