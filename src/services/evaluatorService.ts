import createHttpError from 'http-errors';
import { getAddress, keccak256, toUtf8Bytes } from 'ethers';

import type {
  UsageOutputV1,
  UsageSummary,
  UsageWindow,
  UsageWindowType
} from '../core/contracts/usageOutputV1.js';
import type { UsageWindowInput } from '../core/evaluator/evaluateUsageV1.js';
import { evaluateUsageV1 } from '../core/evaluator/evaluateUsageV1.js';
import { getCampaignConfig } from '../config/campaigns.js';
import {
  usageOutputCache,
  type CacheService
} from './cacheService.js';
import {
  metricsService,
  type MetricsService
} from './metricsService.mock.js';

export type EvaluateRequest = {
  wallet: string;
  campaign_id: string;
  window: UsageWindowInput;
};

export type EvaluationResult = {
  output: UsageOutputV1;
  cached: boolean;
};

export type CampaignRunRequest = {
  campaign_id: string;
  window: UsageWindowInput;
  wallets: string[];
  mode: 'sync';
};

export type CampaignRunItem = {
  wallet: string;
  output: UsageOutputV1;
  cached: boolean;
};

export type CampaignRunSummary = {
  total: number;
  verified_true: number;
  verified_false: number;
  verified_rate: number;
  avg_tx_count: number;
  avg_days_active: number;
  avg_unique_contracts: number;
};

export type CampaignRunResult = {
  results: CampaignRunItem[];
  summary: CampaignRunSummary;
};

export type EvaluatorDependencies = {
  cache?: CacheService<UsageOutputV1>;
  metrics?: MetricsService;
};

const WINDOW_SECONDS: Record<Exclude<UsageWindowType, 'custom'>, number> = {
  last_7_days: 7 * 24 * 60 * 60,
  last_14_days: 14 * 24 * 60 * 60,
  last_30_days: 30 * 24 * 60 * 60
};

const toInteger = (value: number, label: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createHttpError(400, `${label} must be a finite number`);
  }
  return Math.trunc(value);
};

const resolveWindow = (input: UsageWindowInput): UsageWindow => {
  if (!input || !input.type) {
    throw createHttpError(400, 'window.type is required');
  }
  if (input.end === undefined) {
    throw createHttpError(400, 'window.end is required');
  }

  const end = toInteger(input.end, 'window.end');
  let start = input.start;

  if (input.type === 'custom') {
    if (start === undefined) {
      throw createHttpError(400, 'window.start is required for custom windows');
    }
    return {
      type: input.type,
      start: toInteger(start, 'window.start'),
      end
    };
  }

  if (start === undefined) {
    start = end - WINDOW_SECONDS[input.type];
  }

  return {
    type: input.type,
    start: toInteger(start, 'window.start'),
    end
  };
};

const normalizeWallet = (wallet: string) => {
  try {
    return getAddress(wallet.trim());
  } catch (error) {
    throw createHttpError(400, 'wallet must be a valid address');
  }
};

const buildCacheKey = (
  campaign_id: string,
  window: UsageWindow,
  criteria_set_id: string,
  normalizedWallet: string
) => `v1:${campaign_id}:${window.start}:${window.end}:${criteria_set_id}:${normalizedWallet}`;

const summarizeResults = (results: CampaignRunItem[]): CampaignRunSummary => {
  const total = results.length;
  const verified_true = results.filter((entry) => entry.output.verified_usage).length;
  const verified_false = total - verified_true;
  const verified_rate = total ? verified_true / total : 0;

  let total_tx_count = 0;
  let total_days_active = 0;
  let total_unique_contracts = 0;

  for (const entry of results) {
    const summary = entry.output.usage_summary;
    total_tx_count += summary.tx_count;
    total_days_active += summary.days_active;
    total_unique_contracts += summary.unique_contracts;
  }

  return {
    total,
    verified_true,
    verified_false,
    verified_rate,
    avg_tx_count: total ? total_tx_count / total : 0,
    avg_days_active: total ? total_days_active / total : 0,
    avg_unique_contracts: total ? total_unique_contracts / total : 0
  };
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const workerCount = Math.min(concurrency, items.length);
  const runners = Array.from({ length: workerCount }, async () => {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await worker(items[current], current);
    }
  });

  await Promise.all(runners);
  return results;
};

export const createEvaluatorService = (deps: EvaluatorDependencies = {}) => {
  const cache = deps.cache ?? usageOutputCache;
  const metrics = deps.metrics ?? metricsService;

  const evaluateWallet = async (request: EvaluateRequest): Promise<EvaluationResult> => {
    if (!request.campaign_id || typeof request.campaign_id !== 'string') {
      throw createHttpError(400, 'campaign_id is required');
    }
    if (!request.wallet || typeof request.wallet !== 'string') {
      throw createHttpError(400, 'wallet is required');
    }

    const campaign_id = request.campaign_id.trim();
    if (!campaign_id) {
      throw createHttpError(400, 'campaign_id is required');
    }
    const campaign = getCampaignConfig(campaign_id);
    if (!campaign) {
      throw createHttpError(400, `Unknown campaign_id: ${campaign_id}`);
    }

    const normalizedWallet = normalizeWallet(request.wallet);
    const window = resolveWindow(request.window);
    const cacheKey = buildCacheKey(
      campaign_id,
      window,
      campaign.criteria_set_id,
      normalizedWallet
    );

    const cachedOutput = cache.get(cacheKey);
    if (cachedOutput) {
      return { output: cachedOutput, cached: true };
    }

    const usage_summary: UsageSummary = metrics.getUsageSummary({
      campaign_id,
      window,
      wallet: normalizedWallet
    });

    const output = evaluateUsageV1({
      wallet: normalizedWallet,
      campaign_id,
      window,
      criteria: {
        criteria_set_id: campaign.criteria_set_id,
        params: campaign.params
      },
      activity: {
        type: 'summary',
        summary: usage_summary
      }
    });

    cache.set(cacheKey, output);
    return { output, cached: false };
  };

  const runCampaignBatch = async (request: CampaignRunRequest): Promise<CampaignRunResult> => {
    if (request.mode !== 'sync') {
      throw createHttpError(400, 'Only sync mode is supported');
    }

    const results = await mapWithConcurrency(
      request.wallets,
      15,
      async (wallet) => {
        const evaluation = await evaluateWallet({
          wallet,
          campaign_id: request.campaign_id,
          window: request.window
        });

        return {
          wallet: evaluation.output.wallet,
          output: evaluation.output,
          cached: evaluation.cached
        };
      }
    );

    return {
      results,
      summary: summarizeResults(results)
    };
  };

  const generateMockWallets = (campaign_id: string, count: number) => {
    const resolvedCount = Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
    const wallets: string[] = [];

    for (let index = 0; index < resolvedCount; index += 1) {
      const seed = `${campaign_id}:${index}`;
      const hash = keccak256(toUtf8Bytes(seed));
      const hex = `0x${hash.slice(2, 42)}`;
      wallets.push(getAddress(hex));
    }

    return wallets;
  };

  return {
    evaluateWallet,
    runCampaignBatch,
    generateMockWallets
  };
};

export const evaluatorService = createEvaluatorService();
