import { JsonRpcProvider } from 'ethers';
import createHttpError from 'http-errors';

const CHAIN_RPC_ENV_KEYS: Record<number, string> = {
  1: 'RPC_URL_MAINNET',
  10: 'RPC_URL_OPTIMISM',
  56: 'RPC_URL_BNB',
  137: 'RPC_URL_POLYGON',
  42161: 'RPC_URL_ARBITRUM',
  8453: 'RPC_URL_BASE',
  11155111: 'RPC_URL_SEPOLIA'
};

const providerCache = new Map<string, JsonRpcProvider>();

export const resolveRpcEnvKey = (chain_id: number) => CHAIN_RPC_ENV_KEYS[chain_id];

export const resolveRpcUrl = (chain_id: number) => {
  const envKey = resolveRpcEnvKey(chain_id);
  if (!envKey) {
    return undefined;
  }
  return process.env[envKey]?.trim();
};

const getProvider = (rpcUrl: string) => {
  let provider = providerCache.get(rpcUrl);
  if (!provider) {
    provider = new JsonRpcProvider(rpcUrl);
    providerCache.set(rpcUrl, provider);
  }
  return provider;
};

export const getLatestBlock = async (chain_id: number): Promise<number> => {
  const rpcUrl = resolveRpcUrl(chain_id);
  if (!rpcUrl) {
    throw createHttpError(503, 'rpc_missing');
  }

  const provider = getProvider(rpcUrl);
  return provider.getBlockNumber();
};
