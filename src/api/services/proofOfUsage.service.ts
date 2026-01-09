import { evaluateProofOfUsage } from '../../experimental/use-cases/proof-of-usage/evaluator.js';
import type { ProofOfUsageCriteria } from '../../experimental/use-cases/proof-of-usage/criteria.js';

export class ProofOfUsageService {
  static async evaluate(wallet: string, criteria?: Partial<ProofOfUsageCriteria>) {
    return evaluateProofOfUsage(wallet, criteria);
  }
}
