import { Interface } from 'ethers';
const iface = new Interface([
    'event ContributionRecorded(address indexed user, string contributionType, uint256 weight, uint256 timestamp)'
]);
export const CONTRIBUTION_RECORDED_TOPIC = '0xc7b17a73c7b18101b5f28ed931f92ea42cc6a5c0fc230cd3cad29b3139625024';
export const parseContributionRecorded = (log) => {
    const parsed = iface.parseLog(log);
    if (!parsed) {
        throw new Error('Failed to parse ContributionRecorded log');
    }
    const [user, contributionType, weight, timestamp] = parsed.args;
    return {
        user,
        contributionType,
        weight: weight.toString(),
        timestamp: Number(timestamp)
    };
};
