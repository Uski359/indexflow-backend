import type { UsageCriteriaParams } from '../../../src/core/contracts/usageOutputV1.js';
import {
  DEFAULT_CRITERIA_SET_ID,
  criteriaPresets
} from '../../../src/core/criteria/criteriaPresets.js';

export type ProofOfUsageCriteria = UsageCriteriaParams;

export const defaultProofOfUsageCriteria: ProofOfUsageCriteria =
  criteriaPresets[DEFAULT_CRITERIA_SET_ID].params;
