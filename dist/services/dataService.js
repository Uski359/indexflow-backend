import { randomUUID } from 'crypto';
import createHttpError from 'http-errors';
import { createDataset as createDatasetRecord, getDatasetById as fetchDatasetById, insertVerification, listDatasets as listDatasetRecords, setDatasetContractInfo, updateDataset } from '../infra/repositories/datasetRepository.js';
import { config } from '../infra/config/env.js';
import { createNotFoundError } from '../utils/httpError.js';
import { indexDatasetDocument } from './elasticService.js';
import { postValidator } from './validatorClient.js';
export async function listDatasets() {
    return listDatasetRecords();
}
export async function getDatasetById(id) {
    const dataset = await fetchDatasetById(id);
    if (!dataset) {
        throw createNotFoundError('Dataset', id);
    }
    return dataset;
}
function normalizeSample(sample, format) {
    const trimmed = sample.trim();
    if (!trimmed) {
        throw createHttpError(400, 'Sample payload cannot be empty.');
    }
    if (format === 'csv') {
        return { csvPayload: trimmed };
    }
    try {
        const parsed = JSON.parse(trimmed);
        const records = Array.isArray(parsed) ? parsed : [parsed];
        if (records.length === 0) {
            throw new Error('Sample must contain at least one record.');
        }
        return { records };
    }
    catch (error) {
        throw createHttpError(400, 'Sample must be valid JSON (array or object) when using JSON/Parquet formats.');
    }
}
async function runValidator(input) {
    if (!config.dataValidatorUrl || !input.sample) {
        return undefined;
    }
    const payload = {
        metadata: {
            name: input.metadata.name,
            dataset_type: input.metadata.datasetType,
            source: input.metadata.source,
            tags: input.metadata.tags
        }
    };
    if (input.expectedSchema) {
        payload.expected_schema = input.expectedSchema;
    }
    if (input.sqlQuery) {
        payload.sql_query = input.sqlQuery;
    }
    const normalized = normalizeSample(input.sample, input.dataFormat ?? 'json');
    if (normalized.records) {
        payload.records = normalized.records;
    }
    if (normalized.csvPayload) {
        payload.csv_payload = normalized.csvPayload;
    }
    const result = await postValidator('/validate', payload);
    const issues = Array.isArray(result.issues) ? result.issues.map(String) : [];
    return {
        valid: Boolean(result.valid),
        datasetHash: result.dataset_hash,
        sqlHash: result.sql_hash ?? undefined,
        issues,
        inferredSchema: result.inferred_schema ?? {},
        rowCount: Number(result.row_count ?? 0)
    };
}
export async function submitDataset(input) {
    const validation = await runValidator(input);
    const now = new Date().toISOString();
    const dataset = {
        id: `dataset-${randomUUID()}`,
        hash: validation?.datasetHash ?? `0x${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        sqlHash: validation?.sqlHash ?? null,
        metadata: input.metadata,
        status: 'pending',
        reward: estimateReward(input),
        qualityScore: 0.8,
        reputationMultiplier: 1,
        stakeBoost: Math.min(1 + input.stakeAmount / 10000, 1.3),
        updatedAt: now,
        submitter: input.submitter.toLowerCase(),
        validatorSummary: validation
            ? {
                valid: validation.valid,
                datasetHash: validation.datasetHash,
                sqlHash: validation.sqlHash,
                issues: validation.issues,
                inferredSchema: validation.inferredSchema,
                rowCount: validation.rowCount
            }
            : null,
        validatedAt: validation ? now : null
    };
    const created = await createDatasetRecord(dataset);
    await indexDatasetDocument(created);
    return {
        dataset: created,
        stakeRequired: Math.ceil(input.stakeAmount),
        estimatedReward: created.reward,
        validation
    };
}
export async function recordVerification(input) {
    const existing = await fetchDatasetById(input.entryId);
    if (!existing) {
        throw createNotFoundError('Dataset', input.entryId);
    }
    const verification = {
        entryId: input.entryId,
        verifier: input.verifier.toLowerCase(),
        verdict: input.verdict,
        qualityScore: input.qualityScore,
        notes: input.notes,
        processedAt: new Date().toISOString()
    };
    await insertVerification(verification);
    const validatorSummary = {
        valid: input.verdict === 'approved',
        datasetHash: existing.validatorSummary?.datasetHash ?? existing.hash,
        sqlHash: input.sqlHash ?? existing.sqlHash ?? existing.validatorSummary?.sqlHash ?? undefined,
        poiHash: input.poiHash ?? existing.validatorSummary?.poiHash,
        issues: existing.validatorSummary?.issues ?? [],
        inferredSchema: existing.validatorSummary?.inferredSchema ?? {},
        rowCount: existing.validatorSummary?.rowCount ?? 0
    };
    const datasetUpdates = {
        status: input.verdict === 'approved' ? 'indexed' : 'rejected',
        qualityScore: input.qualityScore,
        updatedAt: verification.processedAt,
        validatorSummary,
        validatedAt: verification.processedAt
    };
    if (input.sqlHash) {
        datasetUpdates.sqlHash = input.sqlHash;
    }
    const updatedDataset = await updateDataset(input.entryId, datasetUpdates);
    if (!updatedDataset) {
        throw createNotFoundError('Dataset', input.entryId);
    }
    await indexDatasetDocument(updatedDataset);
    return { dataset: updatedDataset, verification };
}
export async function registerDatasetOnChain(input) {
    const updated = await setDatasetContractInfo(input.datasetId, input.contractDatasetId, input.contentHash);
    if (!updated) {
        throw createNotFoundError('Dataset', input.datasetId);
    }
    return updated;
}
function estimateReward(input) {
    const baseReward = input.metadata.datasetType === 'on-chain' ? 240 : 180;
    const sizeFactor = Math.min(Math.log10(Math.max(input.metadata.sizeInMb, 1)) + 1, 3);
    const stakeBoost = Math.min(1 + input.stakeAmount / 10000, 1.25);
    return Math.round(baseReward * sizeFactor * stakeBoost);
}
