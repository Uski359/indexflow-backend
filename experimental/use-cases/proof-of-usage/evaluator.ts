import type { UsageOutputV1 } from '../../../src/core/contracts/usageOutputV1.js';
import type { UsageEvaluationInput } from '../../../src/core/evaluator/evaluateUsageV1.js';
import { evaluateUsageV1 } from '../../../src/core/evaluator/evaluateUsageV1.js';

export type ProofOfUsageResult = UsageOutputV1;

export const evaluateProofOfUsage = async (
  input: UsageEvaluationInput
): Promise<ProofOfUsageResult> => evaluateUsageV1(input);
