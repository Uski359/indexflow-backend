export class NotImplementedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotImplementedError';
    }
}
const CHAIN_ENV_KEYS = {
    1: 'RPC_URL_MAINNET',
    10: 'RPC_URL_OPTIMISM',
    56: 'RPC_URL_BNB',
    137: 'RPC_URL_POLYGON',
    42161: 'RPC_URL_ARBITRUM',
    8453: 'RPC_URL_BASE',
    11155111: 'RPC_URL_SEPOLIA'
};
const resolveRpcEnvKey = (chainId) => CHAIN_ENV_KEYS[chainId];
const resolveRpcUrl = (chainId) => {
    const envKey = resolveRpcEnvKey(chainId);
    if (!envKey) {
        return undefined;
    }
    return process.env[envKey];
};
export class RpcMetricsProvider {
    async getWalletMetrics(_input) {
        const rpcUrl = resolveRpcUrl(_input.chain_id);
        if (!rpcUrl) {
            throw new Error(`RPC URL not configured for chain_id=${_input.chain_id}. Set ${resolveRpcEnvKey(_input.chain_id) ?? 'RPC_URL_<CHAIN>'}.`);
        }
        void rpcUrl;
        throw new NotImplementedError('RpcMetricsProvider.getWalletMetrics is not implemented yet.');
    }
}
