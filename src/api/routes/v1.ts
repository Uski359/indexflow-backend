import { Router } from 'express';

import campaignRunRouter from './campaignRun.js';
import evaluateRouter from './evaluate.js';
import mockWalletsRouter from './mockWallets.js';

const v1Router = Router();

v1Router.use('/evaluate', evaluateRouter);
v1Router.use('/campaign', campaignRunRouter);
v1Router.use('/campaign', mockWalletsRouter);

export default v1Router;
