import { Router } from 'express';

import { postCampaignRun } from '../controllers/campaignRun.controller.js';
import { postCampaignInsights } from '../controllers/insights.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
  campaignInsightsRequestSchema,
  campaignRunRequestSchema
} from '../../schema/usageMockSchema.js';

const router = Router();

router.post('/run', validateRequest(campaignRunRequestSchema), postCampaignRun);
router.post('/insights', validateRequest(campaignInsightsRequestSchema), postCampaignInsights);

export default router;
