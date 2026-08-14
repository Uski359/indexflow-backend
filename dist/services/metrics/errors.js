export class MetricsNotAvailableError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'MetricsNotAvailableError';
        this.cause = cause;
    }
}
