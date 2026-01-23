import { isAddress } from 'ethers';
import { z } from 'zod';

const windowTypeSchema = z.enum(['last_7_days', 'last_14_days', 'last_30_days', 'custom']);

export const usageWindowSchema = z
  .object({
    type: windowTypeSchema,
    start: z.number().int().optional(),
    end: z.number().int()
  })
  .superRefine((value, ctx) => {
    if (value.type === 'custom' && value.start === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'window.start is required for custom windows',
        path: ['start']
      });
    }
  });

const walletSchema = z
  .string()
  .min(1)
  .refine((value) => isAddress(value), { message: 'wallet must be a valid address' });

export const evaluateRequestSchema = z.object({
  wallet: walletSchema,
  campaign_id: z.string().min(1),
  window: usageWindowSchema
});

export const campaignRunRequestSchema = z.object({
  campaign_id: z.string().min(1),
  window: usageWindowSchema,
  wallets: z.array(walletSchema).min(1),
  mode: z.literal('sync')
});

export const campaignParamsSchema = z.object({
  id: z.string().min(1)
});

export const mockWalletsQuerySchema = z.object({
  count: z.coerce.number().int().positive().max(1000).optional()
});
