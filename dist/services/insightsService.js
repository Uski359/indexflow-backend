import { evaluatorService } from './evaluatorService.js';
import { computeInsightV1 } from '../core/insights/insightsV1.js';
import { insightsCache } from './cacheService.js';
const INSIGHTS_VERSION = 'v1';
export const buildInsightCacheKey = (output) => `insights:${INSIGHTS_VERSION}:${output.campaign_id}:${output.window.start}:${output.window.end}:${output.criteria.criteria_set_id}:${output.wallet}:${output.proof.canonical_hash}`;
const summarizeCampaignInsights = (baseSummary, results) => {
    const total = baseSummary.total;
    let suspected_farm_count = 0;
    let score_total = 0;
    for (const entry of results) {
        if (entry.insights.behavior_tag === 'suspected_farm') {
            suspected_farm_count += 1;
        }
        score_total += entry.insights.overall_score;
    }
    const avg_score = total ? score_total / total : 0;
    return {
        ...baseSummary,
        suspected_farm_count,
        suspected_farm_rate: total ? suspected_farm_count / total : 0,
        avg_score
    };
};
export const createInsightsService = (deps = {}) => {
    const cache = deps.cache ?? insightsCache;
    const evaluator = deps.evaluator ?? evaluatorService;
    const computeInsight = (output) => {
        const cacheKey = buildInsightCacheKey(output);
        const cachedInsight = cache.get(cacheKey);
        if (cachedInsight) {
            return { insights: cachedInsight, cached: true };
        }
        const insights = computeInsightV1(output);
        cache.set(cacheKey, insights);
        return { insights, cached: false };
    };
    const runCampaignInsights = async (request) => {
        const coreResult = await evaluator.runCampaignBatch(request);
        const results = coreResult.results.map((entry) => {
            const computed = computeInsight(entry.output);
            return {
                wallet: entry.wallet,
                output: entry.output,
                insights: computed.insights,
                cached_core: entry.cached,
                cached_insights: computed.cached
            };
        });
        const resolvedWindow = results.length
            ? results[0].output.window
            : {
                type: request.window.type,
                start: request.window.start ?? 0,
                end: request.window.end
            };
        return {
            campaign_id: request.campaign_id,
            window: resolvedWindow,
            meta: coreResult.meta,
            results,
            summary: summarizeCampaignInsights(coreResult.summary, results)
        };
    };
    return {
        computeInsight,
        runCampaignInsights
    };
};
export const insightsService = createInsightsService();
