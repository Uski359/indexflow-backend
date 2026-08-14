import { getAddress, isAddress } from 'ethers';
import { z } from 'zod';
import { logger } from '../infra/config/logger.js';
const campaignDefaultWindowSchema = z.enum([
    'last_7_days',
    'last_14_days',
    'last_30_days'
]);
const campaignTargetSchema = z
    .object({
    address: z
        .string()
        .min(1)
        .refine((value) => isAddress(value), { message: 'target.address must be a valid address' })
        .transform((value) => getAddress(value)),
    label: z.string().min(1).optional(),
    kind: z.literal('contract'),
    tags: z.array(z.string().min(1)).optional()
})
    .strict();
const campaignCriteriaSetSchema = z
    .object({
    id: z.string().min(1),
    label: z.string().min(1),
    enabled: z.boolean()
})
    .strict();
const campaignConfigSchema = z
    .object({
    id: z.string().min(1),
    name: z.string().min(1),
    chain_id: z.number().int().positive(),
    default_window: campaignDefaultWindowSchema,
    criteria_set_id_default: z.string().min(1),
    criteria_sets: z.array(campaignCriteriaSetSchema).optional(),
    targets: z.array(campaignTargetSchema).min(1),
    created_at: z.string().datetime().optional(),
    notes: z.string().min(1).optional()
})
    .strict();
const rawCampaignConfigs = [
    {
        id: 'airdrop_v1',
        name: 'Airdrop v1',
        chain_id: 11155111,
        default_window: 'last_30_days',
        criteria_set_id_default: 'airdrop/basic@1',
        criteria_sets: [
            {
                id: 'airdrop/basic@1',
                label: 'Airdrop Basic v1',
                enabled: true
            }
        ],
        targets: [
            {
                address: '0x0000000000000000000000000000000000000001',
                label: 'IndexFlow Stake Token',
                kind: 'contract',
                tags: ['staking', 'erc20']
            }
        ],
        created_at: '2025-11-01T00:00:00.000Z',
        notes: 'Default demo campaign used by v1 run/insights/commentary flows.'
    }
];
const isStrictValidation = () => {
    const nodeEnv = (process.env.NODE_ENV ?? 'development').toLowerCase();
    return nodeEnv === 'development' || nodeEnv === 'test';
};
const formatIssues = (issues) => issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ');
const validateCampaignConfigs = (configs) => {
    const validConfigs = [];
    const errors = [];
    const seenIds = new Set();
    for (const config of configs) {
        const parsed = campaignConfigSchema.safeParse(config);
        if (!parsed.success) {
            errors.push(`campaign "${config.id ?? '<unknown>'}": ${formatIssues(parsed.error.issues)}`);
            continue;
        }
        const campaign = parsed.data;
        if (seenIds.has(campaign.id)) {
            errors.push(`duplicate campaign id: ${campaign.id}`);
            continue;
        }
        seenIds.add(campaign.id);
        validConfigs.push(campaign);
    }
    if (errors.length > 0) {
        const message = `Invalid campaign configuration: ${errors.join(' | ')}`;
        if (isStrictValidation()) {
            throw new Error(message);
        }
        logger.error({ errors }, message);
    }
    return validConfigs;
};
export const campaignConfigs = validateCampaignConfigs(rawCampaignConfigs);
