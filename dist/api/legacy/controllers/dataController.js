import { getDatasetById, listDatasets, recordVerification, submitDataset } from '../../../services/dataService.js';
export async function listDatasetsHandler(_req, res, next) {
    try {
        const items = await listDatasets();
        res.json({ items });
    }
    catch (error) {
        next(error);
    }
}
export async function submitDatasetHandler(req, res, next) {
    try {
        const payload = req.body;
        const result = await submitDataset(payload);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
}
export async function getDatasetHandler(req, res, next) {
    try {
        const dataset = await getDatasetById(req.params.id);
        res.json(dataset);
    }
    catch (error) {
        next(error);
    }
}
export async function verificationCallbackHandler(req, res, next) {
    try {
        const { dataset, verification } = await recordVerification(req.body);
        res.json({ dataset, verification });
    }
    catch (error) {
        next(error);
    }
}
