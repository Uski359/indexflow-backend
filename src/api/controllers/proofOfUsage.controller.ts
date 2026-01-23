import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../config/logger.js';
import type {
  UsageActivityInput,
  UsageCriteriaInput,
  UsageWindowInput
} from '../../core/evaluator/evaluateUsageV1.js';
import type { UsageCriteriaParams, UsageWindowType } from '../../core/contracts/usageOutputV1.js';
import { evaluateProofOfUsage } from '../services/proofOfUsage.service.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const parseNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const WINDOW_TYPES: UsageWindowType[] = [
  'last_7_days',
  'last_14_days',
  'last_30_days',
  'custom'
];

const parseWindowType = (value: unknown): UsageWindowType | undefined =>
  typeof value === 'string' && WINDOW_TYPES.includes(value as UsageWindowType)
    ? (value as UsageWindowType)
    : undefined;

const parseWindow = (value: unknown): UsageWindowInput | undefined => {
  if (!isRecord(value)) return undefined;
  const type = parseWindowType(value.type);
  if (!type) return undefined;

  return {
    type,
    start: parseNumber(value.start),
    end: parseNumber(value.end)
  };
};

const parseCriteriaParams = (value: unknown): Partial<UsageCriteriaParams> | undefined => {
  if (!isRecord(value)) return undefined;
  const params: Partial<UsageCriteriaParams> = {};

  const min_days_active = parseNumber(value.min_days_active ?? value.minimumActiveDays);
  const min_tx_count = parseNumber(value.min_tx_count ?? value.minimumInteractions);
  const min_unique_contracts = parseNumber(value.min_unique_contracts);

  if (min_days_active !== undefined) {
    params.min_days_active = min_days_active;
  }
  if (min_tx_count !== undefined) {
    params.min_tx_count = min_tx_count;
  }
  if (min_unique_contracts !== undefined) {
    params.min_unique_contracts = min_unique_contracts;
  }

  return Object.keys(params).length ? params : undefined;
};

const parseCriteria = (value: unknown): UsageCriteriaInput | undefined => {
  if (!isRecord(value)) return undefined;

  const criteria_set_id =
    typeof value.criteria_set_id === 'string' ? value.criteria_set_id : undefined;
  const params = parseCriteriaParams(value.params ?? value);

  if (!criteria_set_id && !params) return undefined;

  return {
    criteria_set_id,
    params
  };
};

const parseTransactions = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;
  const transactions = value
    .map((entry) => {
      if (!isRecord(entry)) return undefined;
      const timestamp = parseNumber(entry.timestamp);
      const contractAddress =
        typeof entry.contractAddress === 'string' && entry.contractAddress.trim().length > 0
          ? entry.contractAddress
          : undefined;

      if (timestamp === undefined || !contractAddress) return undefined;

      return { timestamp, contractAddress };
    })
    .filter((entry): entry is { timestamp: number; contractAddress: string } => Boolean(entry));

  return { type: 'transactions', transactions } as UsageActivityInput;
};

const parseSummary = (value: unknown) => {
  if (!isRecord(value)) return undefined;
  const summary = {
    days_active: parseNumber(value.days_active),
    tx_count: parseNumber(value.tx_count),
    unique_contracts: parseNumber(value.unique_contracts)
  };

  if (
    summary.days_active === undefined &&
    summary.tx_count === undefined &&
    summary.unique_contracts === undefined
  ) {
    return undefined;
  }

  return { type: 'summary', summary } as UsageActivityInput;
};

const parseActivity = (value: unknown): UsageActivityInput | undefined => {
  if (!isRecord(value)) return undefined;
  if (Array.isArray(value.transactions)) {
    return parseTransactions(value.transactions);
  }
  if (isRecord(value.summary)) {
    return parseSummary(value.summary);
  }
  return undefined;
};

export const postProofOfUsage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = isRecord(req.body) ? req.body : {};
    const wallet = body.wallet;

    if (typeof wallet !== 'string' || wallet.trim().length === 0) {
      res.status(400).json({ error: 'Wallet is required.' });
      return;
    }

    const window = parseWindow(body.window);
    if (!window || window.end === undefined) {
      res.status(400).json({ error: 'window with type and end is required.' });
      return;
    }

    if (window.type === 'custom' && window.start === undefined) {
      res.status(400).json({ error: 'custom windows require a start timestamp.' });
      return;
    }

    const campaign_id =
      typeof body.campaign_id === 'string'
        ? body.campaign_id
        : typeof body.campaignId === 'string'
          ? body.campaignId
          : undefined;

    const criteria = parseCriteria(body.criteria);
    const activity = parseActivity(body.activity);

    const result = await evaluateProofOfUsage({
      wallet,
      campaign_id,
      window,
      criteria,
      activity
    });

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Failed to evaluate proof-of-usage');
    next(error);
  }
};
