import type { UsageCriteriaParams } from '../core/contracts/usageOutputV1.js';

export type CampaignConfig = {
  campaign_id: string;
  criteria_set_id: string;
  params: UsageCriteriaParams;
};

const CAMPAIGN_CONFIGS: Record<string, CampaignConfig> = {
  airdrop_v1: {
    campaign_id: 'airdrop_v1',
    criteria_set_id: 'airdrop/basic@1',
    params: {
      min_days_active: 7,
      min_tx_count: 10,
      min_unique_contracts: 3
    }
  }
};

export const getCampaignConfig = (campaign_id: string): CampaignConfig | undefined =>
  CAMPAIGN_CONFIGS[campaign_id];
