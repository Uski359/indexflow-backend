import { MetricsNotAvailableError } from '../errors.js';
export class FallbackMetricsProvider {
    constructor(providers) {
        this.providers = providers;
    }
    async getWalletMetrics(input) {
        let lastError;
        for (const provider of this.providers) {
            try {
                return await provider.getWalletMetrics(input);
            }
            catch (error) {
                if (error instanceof MetricsNotAvailableError) {
                    lastError = error;
                    continue;
                }
                throw error;
            }
        }
        if (lastError) {
            throw lastError;
        }
        throw new MetricsNotAvailableError('metrics_not_available');
    }
}
