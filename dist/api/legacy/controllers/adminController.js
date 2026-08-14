import createHttpError from 'http-errors';
import { fetchAdminSettings, updateAdminOracle, updateAdminParameters } from '../../../services/adminService.js';
import { registerDatasetOnChain } from '../../../services/dataService.js';
export async function getParametersHandler(_req, res, next) {
    try {
        const settings = await fetchAdminSettings();
        res.json({
            baseReward: settings.baseReward,
            challengeBond: settings.challengeBond,
            validatorQuorum: settings.validatorQuorum,
            slashPercentage: settings.slashPercentage,
            updatedAt: settings.updatedAt
        });
    }
    catch (error) {
        next(error);
    }
}
export async function updateParametersHandler(req, res, next) {
    try {
        const payload = req.body;
        if (payload.baseReward === undefined ||
            payload.challengeBond === undefined ||
            payload.validatorQuorum === undefined ||
            payload.slashPercentage === undefined) {
            throw createHttpError(400, 'All parameter fields are required');
        }
        const normalized = {
            baseReward: Number(payload.baseReward),
            challengeBond: Number(payload.challengeBond),
            validatorQuorum: Number(payload.validatorQuorum),
            slashPercentage: Number(payload.slashPercentage)
        };
        if (!Number.isFinite(normalized.baseReward) ||
            !Number.isFinite(normalized.challengeBond) ||
            !Number.isFinite(normalized.validatorQuorum) ||
            !Number.isFinite(normalized.slashPercentage)) {
            throw createHttpError(400, 'Parameters must be numeric values');
        }
        const updated = await updateAdminParameters(normalized);
        res.json({
            baseReward: updated.baseReward,
            challengeBond: updated.challengeBond,
            validatorQuorum: updated.validatorQuorum,
            slashPercentage: updated.slashPercentage,
            updatedAt: updated.updatedAt
        });
    }
    catch (error) {
        next(error);
    }
}
export async function getOracleHandler(_req, res, next) {
    try {
        const settings = await fetchAdminSettings();
        res.json({
            oracleUrl: settings.oracleUrl,
            updatedAt: settings.updatedAt
        });
    }
    catch (error) {
        next(error);
    }
}
export async function updateOracleHandler(req, res, next) {
    try {
        const payload = req.body;
        if (!payload.url) {
            throw createHttpError(400, 'Oracle URL is required');
        }
        const updated = await updateAdminOracle(payload.url);
        res.json({
            oracleUrl: updated.oracleUrl,
            updatedAt: updated.updatedAt
        });
    }
    catch (error) {
        next(error);
    }
}
export async function registerDatasetHandler(req, res, next) {
    try {
        const payload = req.body;
        const dataset = await registerDatasetOnChain(payload);
        res.json({ dataset });
    }
    catch (error) {
        next(error);
    }
}
