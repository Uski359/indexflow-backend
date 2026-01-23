import type {
  UsageActivityInput,
  UsageCriteriaInput,
  UsageEvaluationInput,
  UsageWindowInput
} from '../../core/evaluator/evaluateUsageV1.js';
import { evaluateUsageV1 } from '../../core/evaluator/evaluateUsageV1.js';
import { DEFAULT_CRITERIA_SET_ID } from '../../core/criteria/criteriaPresets.js';
import type { UsageOutputV1, UsageSummary } from '../../core/contracts/usageOutputV1.js';

export type ProofOfUsageRequest = {
  wallet: string;
  campaign_id?: string;
  window: UsageWindowInput;
  criteria?: UsageCriteriaInput;
  activity?: UsageActivityInput;
};

const DEFAULT_CAMPAIGN_ID = 'default';

const fetchRecentInteractions = async (
  _walletAddress: string,
  _window: UsageWindowInput
): Promise<UsageSummary> => {
  // TODO: Replace with the core's read-only query once it is exposed for usage checks.
  return {
    days_active: 0,
    tx_count: 0,
    unique_contracts: 0
  };
};

export const evaluateProofOfUsage = async (
  request: ProofOfUsageRequest
): Promise<UsageOutputV1> => {
  const activity =
    request.activity ??
    ({
      type: 'summary',
      summary: await fetchRecentInteractions(request.wallet, request.window)
    } as UsageActivityInput);

  const criteria = request.criteria ?? { criteria_set_id: DEFAULT_CRITERIA_SET_ID };

  const input: UsageEvaluationInput = {
    wallet: request.wallet,
    campaign_id: request.campaign_id ?? DEFAULT_CAMPAIGN_ID,
    window: request.window,
    criteria,
    activity
  };

  return evaluateUsageV1(input);
};
