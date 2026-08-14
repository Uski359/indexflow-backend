import { campaignConfigs } from './campaigns.js';
const campaignIndex = new Map(campaignConfigs.map((campaign) => [campaign.id, campaign]));
const normalizeCampaignId = (campaignId) => campaignId.trim();
export const getCampaign = (campaignId) => campaignIndex.get(normalizeCampaignId(campaignId));
export const listCampaigns = () => Array.from(campaignIndex.values());
export const getCampaignTargets = (campaignId) => {
    const campaign = getCampaign(campaignId);
    if (!campaign) {
        return [];
    }
    return campaign.targets.map((target) => target.address.toLowerCase());
};
export const getDefaultCriteriaSet = (campaignId) => {
    const campaign = getCampaign(campaignId);
    if (!campaign) {
        throw new Error(`Unknown campaign_id: ${campaignId}`);
    }
    return campaign.criteria_set_id_default;
};
