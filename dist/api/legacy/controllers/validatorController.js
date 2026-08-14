import { generateProof, scheduleProofSubmission, listProofJobs, updateProofJob } from '../../../services/validatorOpsService.js';
export async function generateProofHandler(req, res, next) {
    try {
        const payload = req.body;
        const result = await generateProof(payload);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
}
export async function scheduleProofHandler(req, res, next) {
    try {
        const payload = req.body;
        const job = await scheduleProofSubmission(payload);
        res.status(201).json(job);
    }
    catch (error) {
        next(error);
    }
}
export async function listProofJobsHandler(_req, res, next) {
    try {
        const jobs = await listProofJobs();
        res.json({ items: jobs });
    }
    catch (error) {
        next(error);
    }
}
export async function updateProofJobHandler(req, res, next) {
    try {
        const { jobId } = req.params;
        const payload = req.body;
        const job = await updateProofJob(jobId, payload);
        res.json(job);
    }
    catch (error) {
        next(error);
    }
}
