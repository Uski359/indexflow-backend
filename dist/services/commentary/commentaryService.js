import { logger } from '../../infra/config/logger.js';
import { commentaryCache } from '../cacheService.js';
import { DisabledProvider } from './providers/disabledProvider.js';
import { OpenAIProvider } from './providers/openAIProvider.js';
const COMMENTARY_VERSION = 'v1';
export const buildCommentaryCacheKey = (output, insights) => `commentary:${COMMENTARY_VERSION}:${output.campaign_id}:${output.window.start}:${output.window.end}:${output.criteria.criteria_set_id}:${output.wallet}:${output.proof.canonical_hash}:${insights.insight_version}`;
const createProviderFromEnv = () => {
    if (process.env.COMMENTARY_PROVIDER?.toLowerCase() !== 'openai') {
        return undefined;
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        logger.warn('COMMENTARY_PROVIDER=openai but OPENAI_API_KEY is missing');
        return undefined;
    }
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    return new OpenAIProvider({ apiKey, model });
};
export const createCommentaryService = (deps = {}) => {
    const cache = deps.cache ?? commentaryCache;
    const fallbackProvider = new DisabledProvider();
    const provider = deps.provider ?? createProviderFromEnv() ?? fallbackProvider;
    const getCommentaryForOutput = async (output, insights) => {
        const cacheKey = buildCommentaryCacheKey(output, insights);
        const cachedCommentary = cache.get(cacheKey);
        if (cachedCommentary) {
            return { commentary: cachedCommentary, cached: true };
        }
        let text = '';
        let model = provider.name();
        if (provider.name() === fallbackProvider.name()) {
            text = await provider.generate({ output, insights });
        }
        else {
            try {
                text = await provider.generate({ output, insights });
            }
            catch (error) {
                logger.warn({ err: error }, 'Commentary provider failed, falling back');
                text = await fallbackProvider.generate({ output, insights });
                model = fallbackProvider.name();
            }
        }
        const commentary = {
            commentary_version: 'v1',
            model,
            text,
            created_at: Math.floor(Date.now() / 1000)
        };
        cache.set(cacheKey, commentary);
        return { commentary, cached: false };
    };
    return {
        getCommentaryForOutput
    };
};
export const commentaryService = createCommentaryService();
