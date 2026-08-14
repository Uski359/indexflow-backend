export const DEFAULT_CRITERIA_SET_ID = 'airdrop/basic@1';
export const criteriaPresets = {
    [DEFAULT_CRITERIA_SET_ID]: {
        criteria_set_id: DEFAULT_CRITERIA_SET_ID,
        params: {
            min_days_active: 7,
            min_tx_count: 10,
            min_unique_contracts: 3
        }
    }
};
