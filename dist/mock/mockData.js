import { randomUUID } from 'crypto';
export const datasets = [];
export const stakes = [];
export const verificationResults = [];
export const rewardSummary = {
    address: 'network',
    pending: 0,
    lifetime: 0,
    latestDistributions: []
};
export const challenges = [];
export function addDataset(dataset) {
    datasets.push(dataset);
    return dataset;
}
export function upsertStake(position) {
    const index = stakes.findIndex((stake) => stake.id === position.id);
    if (index >= 0) {
        stakes[index] = position;
    }
    else {
        stakes.push(position);
    }
    return position;
}
export function createStakeId() {
    return `stake-${randomUUID()}`;
}
export function createChallengeId() {
    return `challenge-${randomUUID()}`;
}
export function searchDatasetsLocally(query) {
    if (!query) {
        return datasets;
    }
    const lowered = query.toLowerCase();
    return datasets.filter((dataset) => {
        const haystacks = [
            dataset.metadata.name,
            dataset.metadata.description,
            dataset.metadata.tags.join(' '),
            dataset.hash
        ].join(' ');
        return haystacks.toLowerCase().includes(lowered);
    });
}
