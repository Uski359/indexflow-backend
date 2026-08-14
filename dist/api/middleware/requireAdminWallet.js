import createHttpError from 'http-errors';
import { config } from '../../infra/config/env.js';
const ADMIN_HEADER = 'x-admin-wallet';
export function requireAdminWallet(req, _res, next) {
    const header = req.headers[ADMIN_HEADER];
    const wallet = header?.toLowerCase();
    if (!wallet) {
        return next(createHttpError(401, 'Admin wallet address required'));
    }
    if (config.adminWalletAddresses.length === 0) {
        return next(createHttpError(503, 'Admin wallet list not configured'));
    }
    if (!config.adminWalletAddresses.includes(wallet)) {
        return next(createHttpError(403, 'Admin wallet not authorized'));
    }
    return next();
}
