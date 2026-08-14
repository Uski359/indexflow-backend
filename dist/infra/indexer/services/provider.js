import { JsonRpcProvider } from 'ethers';
import { getChainConfig } from '../chains/index.js';
import { logger } from '../logger.js';
import { withRetry } from '../utils/retry.js';
import { createRpcLimiter } from './ratelimiter.js';
const DEFAULT_TIMEOUT_MS = 20000;
const providerContexts = new Map();
const shouldFailover = (error) => {
    const code = error?.code;
    return (code === 'ENOTFOUND' ||
        code === 'ECONNREFUSED' ||
        code === 'NETWORK_ERROR' ||
        code === 'SERVER_ERROR');
};
const maskRpcUrl = (url) => {
    if (!url)
        return 'unknown';
    const sanitized = url.replace(/^https?:\/\//iu, '');
    if (sanitized.length <= 10)
        return '***';
    return `${sanitized.slice(0, 6)}***${sanitized.slice(-4)}`;
};
const buildRpcPool = (chain) => {
    const baseKey = chain.rpcEnvKey;
    const candidates = [
        process.env[`${baseKey}_1`],
        process.env[`${baseKey}_2`],
        process.env[`${baseKey}_3`],
        process.env[baseKey]
    ].filter((url) => Boolean(url));
    const rpcPool = Array.from(new Set(candidates));
    if (rpcPool.length === 0) {
        throw new Error(`No RPC endpoints configured for ${chain.id}. Set ${baseKey}_1/${baseKey}_2/${baseKey}_3.`);
    }
    return rpcPool;
};
const createContext = (chain) => {
    const rpcPool = buildRpcPool(chain);
    const limiter = createRpcLimiter(chain.id);
    const provider = new JsonRpcProvider(rpcPool[0], undefined, { staticNetwork: true });
    return {
        chain,
        rpcPool,
        currentRpcIndex: 0,
        provider,
        limiter
    };
};
const rotateProvider = (context) => {
    context.currentRpcIndex = (context.currentRpcIndex + 1) % context.rpcPool.length;
    const nextRpc = context.rpcPool[context.currentRpcIndex];
    context.provider = new JsonRpcProvider(nextRpc, undefined, { staticNetwork: true });
};
const executeWithFailover = async (context, taskName, handler) => {
    let lastError;
    const limitedSchedule = async (fn) => withRetry(() => context.limiter.schedule(fn), {
        taskName,
        logger,
        timeoutMs: DEFAULT_TIMEOUT_MS
    });
    for (let attempt = 0; attempt < context.rpcPool.length; attempt += 1) {
        try {
            return await limitedSchedule(() => handler(context.provider));
        }
        catch (error) {
            lastError = error;
            if (!shouldFailover(error)) {
                throw error;
            }
            const failedRpc = context.rpcPool[context.currentRpcIndex];
            rotateProvider(context);
            const nextRpc = context.rpcPool[context.currentRpcIndex];
            logger.warn('RPC failed; switching endpoint', {
                chainId: context.chain.id,
                taskName,
                attempt: attempt + 1,
                failedRpc: maskRpcUrl(failedRpc),
                nextRpc: maskRpcUrl(nextRpc),
                code: error?.code
            });
        }
    }
    throw lastError instanceof Error ? lastError : new Error('RPC pool exhausted');
};
export const getProvider = (chainId) => {
    const chain = getChainConfig(chainId);
    if (!providerContexts.has(chainId)) {
        providerContexts.set(chainId, createContext(chain));
    }
    const context = providerContexts.get(chainId);
    return {
        chain,
        get provider() {
            return context.provider;
        },
        get rpcUrl() {
            return context.rpcPool[context.currentRpcIndex];
        },
        getBlockNumber: () => executeWithFailover(context, `${chain.id}:getBlockNumber`, (prov) => prov.getBlockNumber()),
        getLogs: (filter) => executeWithFailover(context, `${chain.id}:getLogs`, (prov) => prov.getLogs({
            ...filter,
            address: filter.address ?? chain.tokenAddress ?? undefined
        }))
    };
};
export const obfuscateRpcUrl = maskRpcUrl;
