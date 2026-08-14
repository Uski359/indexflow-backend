import { logger } from '../../../infra/config/logger.js';
import { resolveTargets, resolveWalletVariants } from '../providerInput.js';
const buildCacheKey = (input) => {
    const wallet = resolveWalletVariants(input.wallet)[0] ?? input.wallet.trim().toLowerCase();
    const targets = resolveTargets(input).sort().join(',') || 'none';
    return `metrics:v1:${input.campaign_id}:${input.chain_id}:${input.start}:${input.end}:${wallet}:${targets}`;
};
export class CacheMetricsProvider {
    constructor(cache, inner) {
        this.cache = cache;
        this.inner = inner;
    }
    async getWalletMetrics(input) {
        const cacheKey = buildCacheKey(input);
        const cached = this.cache.get(cacheKey);
        if (cached) {
            logger.debug({ source: 'cache', cacheKey }, 'Resolved wallet metrics');
            return cached;
        }
        const result = await this.inner.getWalletMetrics(input);
        this.cache.set(cacheKey, result);
        return result;
    }
}
