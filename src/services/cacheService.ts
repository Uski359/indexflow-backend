import type { UsageOutputV1 } from '../core/contracts/usageOutputV1.js';
import type { InsightV1 } from '../insights/insightsV1.js';
import type { CommentaryV1 } from '../commentary/types.js';

export type CacheService<T> = {
  get: (key: string) => T | undefined;
  set: (key: string, value: T) => void;
  delete: (key: string) => void;
  clear: () => void;
};

export type CacheOptions = {
  ttlMs: number;
  now?: () => number;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class TTLCache<T> implements CacheService<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(options: CacheOptions) {
    this.ttlMs = options.ttlMs;
    this.now = options.now ?? (() => Date.now());
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T) {
    this.store.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }

  delete(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

export const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000;

export const createTTLCache = <T>(options: CacheOptions) => new TTLCache<T>(options);

export const usageOutputCache = createTTLCache<UsageOutputV1>({
  ttlMs: DEFAULT_CACHE_TTL_MS
});

export const insightsCache = createTTLCache<InsightV1>({
  ttlMs: DEFAULT_CACHE_TTL_MS
});

export const commentaryCache = createTTLCache<CommentaryV1>({
  ttlMs: DEFAULT_CACHE_TTL_MS
});
