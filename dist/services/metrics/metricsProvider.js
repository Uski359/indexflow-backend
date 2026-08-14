import { createTTLCache, DEFAULT_CACHE_TTL_MS } from '../cacheService.js';
import { CacheMetricsProvider } from './providers/CacheMetricsProvider.js';
import { FallbackMetricsProvider } from './providers/FallbackMetricsProvider.js';
import { IndexerDbMetricsProvider } from './providers/IndexerDbMetricsProvider.js';
import { RpcMetricsProvider } from './providers/RpcMetricsProvider.js';
export const createChainedMetricsProvider = (deps = {}) => {
    const cache = deps.cache ??
        createTTLCache({
            ttlMs: DEFAULT_CACHE_TTL_MS
        });
    const db = new IndexerDbMetricsProvider();
    const rpc = new RpcMetricsProvider();
    const fallback = new FallbackMetricsProvider([db, rpc]);
    return new CacheMetricsProvider(cache, fallback);
};
export const metricsProvider = createChainedMetricsProvider();
