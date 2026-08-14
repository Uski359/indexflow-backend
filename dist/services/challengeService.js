import { randomUUID } from 'crypto';
import createHttpError from 'http-errors';
import { fetchChallenges, insertChallenge } from '../infra/repositories/challengeRepository.js';
import { getDatasetById, updateDataset } from '../infra/repositories/datasetRepository.js';
import { createNotFoundError } from '../utils/httpError.js';
export async function listChallenges() {
    return fetchChallenges();
}
export async function createChallenge(input) {
    const dataset = await getDatasetById(input.entryId);
    if (!dataset) {
        throw createNotFoundError('Dataset', input.entryId);
    }
    if (dataset.status === 'rejected') {
        throw createHttpError(409, 'Cannot challenge a rejected dataset');
    }
    const challenge = {
        id: `challenge-${randomUUID()}`,
        entryId: input.entryId,
        challenger: input.challenger.toLowerCase(),
        reason: input.reason,
        bond: input.bond,
        status: 'pending',
        openedAt: new Date().toISOString()
    };
    await updateDataset(dataset.id, {
        status: 'challenged',
        updatedAt: challenge.openedAt
    });
    return insertChallenge(challenge);
}
