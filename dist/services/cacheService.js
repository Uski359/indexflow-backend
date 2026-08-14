export class TTLCache {
    constructor(options) {
        this.store = new Map();
        this.ttlMs = options.ttlMs;
        this.now = options.now ?? (() => Date.now());
        this.maxEntries = options.maxEntries;
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry) {
            return undefined;
        }
        if (entry.expiresAt <= this.now()) {
            this.store.delete(key);
            return undefined;
        }
        // Refresh LRU ordering on access.
        if (this.maxEntries) {
            this.store.delete(key);
            this.store.set(key, entry);
        }
        return entry.value;
    }
    set(key, value) {
        if (this.maxEntries) {
            this.store.delete(key);
        }
        this.store.set(key, { value, expiresAt: this.now() + this.ttlMs });
        if (this.maxEntries) {
            while (this.store.size > this.maxEntries) {
                const oldest = this.store.keys().next().value;
                if (!oldest) {
                    break;
                }
                this.store.delete(oldest);
            }
        }
    }
    delete(key) {
        this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
}
export const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000;
export const createTTLCache = (options) => new TTLCache(options);
export const usageOutputCache = createTTLCache({
    ttlMs: DEFAULT_CACHE_TTL_MS
});
export const insightsCache = createTTLCache({
    ttlMs: DEFAULT_CACHE_TTL_MS
});
export const commentaryCache = createTTLCache({
    ttlMs: DEFAULT_CACHE_TTL_MS
});
