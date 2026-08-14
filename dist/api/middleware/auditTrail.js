import { auditLogger } from '../../infra/config/auditLogger.js';
export const auditAdminAction = (req, _res, next) => {
    auditLogger.info({
        event: 'admin_action',
        method: req.method,
        path: req.originalUrl,
        adminWallet: req.headers['x-admin-wallet']?.toLowerCase()
    });
    next();
};
export const auditValidatorAction = (req, _res, next) => {
    auditLogger.info({
        event: 'validator_action',
        method: req.method,
        path: req.originalUrl,
        validator: req.body?.validator?.toLowerCase(),
        datasetId: req.body?.datasetId ?? req.body?.dataset_id,
        jobId: req.params?.jobId
    });
    next();
};
