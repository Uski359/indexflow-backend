import { Router } from 'express';

import { postCampaignRun } from '../controllers/campaignRun.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { campaignRunRequestSchema } from '../../schema/usageMockSchema.js';

const router = Router();

router.post('/run', validateRequest(campaignRunRequestSchema), postCampaignRun);

export default router;
