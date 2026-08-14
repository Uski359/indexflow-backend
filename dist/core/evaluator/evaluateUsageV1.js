import { getAddress } from 'ethers';
import { DEFAULT_CRITERIA_SET_ID, criteriaPresets } from '../criteria/criteriaPresets.js';
import { USAGE_ENGINE_VERSION, USAGE_OUTPUT_PROTOCOL, USAGE_OUTPUT_VERSION } from '../contracts/usageOutputV1.js';
import { getUsageOutputHash } from '../proof/proofHash.js';
const WINDOW_SECONDS = {
    last_7_days: 7 * 24 * 60 * 60,
    last_14_days: 14 * 24 * 60 * 60,
    last_30_days: 30 * 24 * 60 * 60
};
const toInteger = (value, label) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`${label} must be a finite number`);
    }
    return Math.trunc(value);
};
const toNonNegativeInteger = (value, label) => {
    const resolved = toInteger(value, label);
    if (resolved < 0) {
        throw new Error(`${label} must be non-negative`);
    }
    return resolved;
};
const normalizeWallet = (wallet) => getAddress(wallet);
const resolveWindow = (input) => {
    if (!input || !input.type) {
        throw new Error('window.type is required');
    }
    if (input.end === undefined) {
        throw new Error('window.end is required for deterministic evaluation');
    }
    const end = toInteger(input.end, 'window.end');
    let start = input.start;
    if (input.type === 'custom') {
        if (start === undefined) {
            throw new Error('window.start is required for custom windows');
        }
        return {
            type: input.type,
            start: toInteger(start, 'window.start'),
            end
        };
    }
    if (start === undefined) {
        start = end - WINDOW_SECONDS[input.type];
    }
    return {
        type: input.type,
        start: toInteger(start, 'window.start'),
        end
    };
};
const resolveCriteriaParams = (input) => {
    const criteria_set_id = input?.criteria_set_id ?? DEFAULT_CRITERIA_SET_ID;
    const preset = criteriaPresets[criteria_set_id];
    const baseParams = preset?.params;
    const overrides = input?.params ?? {};
    const resolveParam = (value, fallback, label) => {
        const resolved = value ?? fallback;
        if (resolved === undefined) {
            throw new Error(`criteria.params.${label} is required`);
        }
        return toNonNegativeInteger(resolved, `criteria.params.${label}`);
    };
    return {
        criteria_set_id,
        params: {
            min_days_active: resolveParam(overrides.min_days_active, baseParams?.min_days_active, 'min_days_active'),
            min_tx_count: resolveParam(overrides.min_tx_count, baseParams?.min_tx_count, 'min_tx_count'),
            min_unique_contracts: resolveParam(overrides.min_unique_contracts, baseParams?.min_unique_contracts, 'min_unique_contracts')
        }
    };
};
const resolveSummaryFromTransactions = (transactions, window) => {
    const daySet = new Set();
    const contractSet = new Set();
    let tx_count = 0;
    for (const transaction of transactions) {
        if (!transaction)
            continue;
        const timestamp = toInteger(transaction.timestamp, 'transaction.timestamp');
        if (timestamp < window.start || timestamp > window.end) {
            continue;
        }
        if (typeof transaction.contractAddress !== 'string') {
            throw new Error('transaction.contractAddress must be a string');
        }
        tx_count += 1;
        daySet.add(Math.floor(timestamp / (24 * 60 * 60)));
        const normalizedAddress = transaction.contractAddress.trim().toLowerCase();
        if (!normalizedAddress) {
            throw new Error('transaction.contractAddress is required');
        }
        contractSet.add(normalizedAddress);
    }
    return {
        days_active: daySet.size,
        tx_count,
        unique_contracts: contractSet.size
    };
};
const resolveSummary = (activity, window) => {
    if (activity.type === 'transactions') {
        return resolveSummaryFromTransactions(activity.transactions, window);
    }
    const summary = activity.summary ?? {};
    const resolveValue = (value, label) => {
        if (value === undefined || value === null) {
            return 0;
        }
        return toNonNegativeInteger(value, `usage_summary.${label}`);
    };
    return {
        days_active: resolveValue(summary.days_active, 'days_active'),
        tx_count: resolveValue(summary.tx_count, 'tx_count'),
        unique_contracts: resolveValue(summary.unique_contracts, 'unique_contracts')
    };
};
export const evaluateUsageV1 = (input) => {
    if (!input || typeof input.wallet !== 'string') {
        throw new Error('wallet is required');
    }
    if (!input.campaign_id || typeof input.campaign_id !== 'string') {
        throw new Error('campaign_id is required');
    }
    if (!input.activity) {
        throw new Error('activity is required');
    }
    const wallet = normalizeWallet(input.wallet.trim());
    const campaign_id = input.campaign_id.trim();
    if (!campaign_id) {
        throw new Error('campaign_id is required');
    }
    const window = resolveWindow(input.window);
    const { criteria_set_id, params } = resolveCriteriaParams(input.criteria);
    const usage_summary = resolveSummary(input.activity, window);
    const verified_usage = usage_summary.days_active >= params.min_days_active &&
        usage_summary.tx_count >= params.min_tx_count &&
        usage_summary.unique_contracts >= params.min_unique_contracts;
    const outputBase = {
        protocol: USAGE_OUTPUT_PROTOCOL,
        output_version: USAGE_OUTPUT_VERSION,
        wallet,
        campaign_id,
        window,
        verified_usage,
        usage_summary,
        criteria: {
            criteria_set_id,
            engine_version: USAGE_ENGINE_VERSION,
            params
        },
        proof: {
            hash_algorithm: 'keccak256',
            canonical_hash: ''
        }
    };
    const { hash } = getUsageOutputHash(outputBase);
    return {
        ...outputBase,
        proof: {
            hash_algorithm: 'keccak256',
            canonical_hash: hash
        }
    };
};
